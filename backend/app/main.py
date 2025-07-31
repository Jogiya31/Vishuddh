from fastapi import FastAPI, Request, Response, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import pyodbc
import pandas as pd
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, EmailStr
from collections import defaultdict
import urllib
import io
from io import BytesIO
from decimal import Decimal
from datetime import datetime
import openpyxl
from starlette.middleware.base import BaseHTTPMiddleware
import math
import json

from app.static.scrap_mapping import scrap_mapping
import subprocess
from pathlib import Path
from sse_starlette.sse import EventSourceResponse
import asyncio


# Additional imports for password hashing & JWT
#from passlib.context import CryptContext    
import jwt  
import os
from app.core.config import settings


from app.utils.helpers import format_date_custom, parse_date, verify_password, create_jwt_token, sanitize_data, create_db_connection, format_number, number_to_indian_currency_format, format_date_custom, matching_data_national, format_percentage_with_min, matching_data_state, format_date_custom2, format_percentage_with_min, matching_data_district, get_current_user


app = FastAPI()

# app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")  #This assumes dist/assets is relative to where the script is run from
#app.mount("/app", StaticFiles(directory="dist/assets"), name="assets")


class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Add security headers
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        if "server" in response.headers:
            del response.headers["server"]

        return response
app.add_middleware(SecureHeadersMiddleware)


origins = [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://localhost:5173"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/scheme-department-mapping")
def get_scheme_department_mapping_details(current_user: dict = Depends(get_current_user)):
    details = {}
    conn = create_db_connection()
    if not conn:
        return JSONResponse(content=details)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT Scheme_Name, Department_Name FROM KPI_Master")
        for row in cursor.fetchall():
            details[row[0]] = row[1]
    except pyodbc.Error as e:
        print(f"Error fetching Scheme-Department mapping: {e}")
        HTTPException(status_code=500, detail="Internal server error occurred.")
    finally:
        conn.close()
    return JSONResponse(content=details)

@app.get("/api/scheme-ministry-mapping")
def get_scheme_ministry_mapping_details(current_user: dict = Depends(get_current_user)):
    details = {}
    conn = create_db_connection()
    if not conn:
        return JSONResponse(content=details)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT Scheme_Name, Ministry_Name FROM KPI_Master")
        for row in cursor.fetchall():
            details[row[0]] = row[1]
    except pyodbc.Error as e:
        print(f"Error fetching Scheme-Ministry mapping: {e}")
    finally:
        conn.close()
    return JSONResponse(content=details)

@app.get("/api/scheme-sector-mapping")
def get_scheme_sector_mapping_details(current_user: dict = Depends(get_current_user)):
    details = {}
    conn = create_db_connection()
    if not conn:
        return JSONResponse(content=details)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT KPI_Name, Sector_Name, Ministry_Name, Department_Name, Scheme_Name FROM KPI_Master")
        for row in cursor.fetchall():
            details[row[4]] = row[1]
    except pyodbc.Error as e:
        print(f" Error fetching KPI details: {e}")
    finally:
        conn.close()
    return JSONResponse(content=details)


def get_scheme_kpi_mapping() -> Dict[str, List[Dict[str, str]]]:
    mapping = {}
    conn = create_db_connection()
    if not conn:
        return mapping
    try:
        cursor = conn.cursor()

        # First, fetch KPI with granularity
        cursor.execute("SELECT Scheme_Name, KPI_Name, Frequency, Granularity FROM KPI_Master")
        for scheme, kpi, frequency, granularity in cursor.fetchall():
            if scheme not in mapping:
                mapping[scheme] = []
            mapping[scheme].append({
                "KPI Name": kpi,
                "Frequency": frequency,
                "Granularity": granularity,
                "National_URL": "",
                "State_URL": "",
                "District_URL": ""
            })

        # Then update with corresponding URLs
        cursor.execute("""
            SELECT KPI_ID, KPI_Name, Scheme_Name, National_URL, State_URL, District_URL 
            FROM KPI_URL_Mapping
        """)
        for row in cursor.fetchall():
            scheme, kpi_name = row[2], row[1]
            if scheme in mapping:
                for kpi_item in mapping[scheme]:
                    if kpi_item["KPI Name"] == kpi_name:
                        kpi_item["National_URL"] = row[3] if row[3] else ""
                        kpi_item["State_URL"] = row[4] if row[4] else ""
                        kpi_item["District_URL"] = row[5] if row[5] else ""
                        break
    except pyodbc.Error as e:
        print(f" Error fetching Scheme-KPI-URL mapping: {e}")
    finally:
        conn.close()
    return mapping

def get_kpi_details() -> List[Dict[str, str]]:
    details = []
    conn = create_db_connection()
    if not conn:
        return details
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT KPI_Name, Sector_Name, Ministry_Name, Department_Name, Scheme_Name FROM KPI_Master")
        for row in cursor.fetchall():
            temp = {
                row[1]: {
                    row[2]: {
                        row[3]: [row[4]]
                    }
                }
            }
            details.append(temp)
    except pyodbc.Error as e:
        print(f" Error fetching KPI details: {e}")
    finally:
        conn.close()
    return details

@app.get("/api/get_scheme_kpi_mapping")
async def get_scheme_kpi_mapping_api(current_user: dict = Depends(get_current_user)):
    return JSONResponse(content=get_scheme_kpi_mapping())

@app.get("/api/get-kpi-details")
async def fetch_kpi_details(current_user: dict = Depends(get_current_user)):
    return JSONResponse(content=get_kpi_details())

# --------------------- Endpoints ---------------------
# National-level endpoints
@app.get("/api/generate-national-report-unit")
def get_merged_national_data(current_user: dict = Depends(get_current_user)):
    """Fetch merged national data with unit labels and additional KPI details and mapping data."""
    merged_data = matching_data_national(with_units=True)
    result = {
        "nationalReportData": merged_data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)

@app.get("/api/generate-national-report")
def get_merged_national_data_no_units(current_user: dict = Depends(get_current_user)):
    """Fetch merged national data without unit labels."""
    data = matching_data_national(with_units=False)
    result = {
        "nationalReportData": data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)

# State-level endpoints
@app.get("/api/generate-state-report-unit")
def get_merged_state_data(current_user: dict = Depends(get_current_user)):
    """Fetch merged state data with unit labels."""
    data = matching_data_state(with_units=True)
    result = {
        "stateReportData": data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)

@app.get("/api/generate-state-report")
def get_merged_state_data_no_units(current_user: dict = Depends(get_current_user)):
    """Fetch merged state data without unit labels."""
    data = matching_data_state(with_units=False)
    result = {
        "stateReportData": data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)

# District-level endpoints
@app.get("/api/generate-district-report-unit")
def get_merged_district_data(current_user: dict = Depends(get_current_user)):
    """Fetch merged district data with unit labels."""
    data = matching_data_district(with_units=True)
    result = {
        "districtReportData": data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)

@app.get("/api/district-summary-report")
def get_merged_district_data_no_units(current_user: dict = Depends(get_current_user)):
    """Fetch merged district data without unit labels."""
    data = matching_data_district(with_units=False)
    result = {
        "districtReportData": data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)



SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    message:str
    username: str
    token: str
    token_type: str = "bearer"

@app.post("/api/login", response_model=TokenResponse)
def login(request: LoginRequest):
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cursor = conn.cursor()
    cursor.execute("SELECT username, email, hashed_password FROM Users WHERE email = ?", (request.email,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    username, email, hashed_password = user
    if not verify_password(request.password, hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token_data = {"sub": email}
    jwt_token = create_jwt_token(token_data)

    return {
        "message": "Login Successful",
        "username": username,
        "token": jwt_token,
        "token_type": "bearer"
    }
"""  ## Ojas removed this 
class DateRequest(BaseModel):
    date: str  # e.g. 'dd-mm-yyyy'    
@app.post("/api/national-historical-report")
async def get_national_summary_report_historical(request: DateRequest, current_user: dict = Depends(get_current_user)):
   
    merged_data = matching_data_national(with_units=True)
    result = {
        "NationalReportData": merged_data,
        "kpiDetails": get_kpi_details(),
        "mappingData": get_scheme_kpi_mapping()
    }
    return JSONResponse(content=result)
"""    

class DateRequest(BaseModel):
    date: str  # Expecting 'YYYY-MM-DD'



# 👤 Pydantic model to receive the date from the UI
class DateInput(BaseModel):
    filter_date: str  # format: dd-mm-yyyy



@app.post("/api/state-historical-nested")
def fetch_nested_state_data(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()

        # Run SP with scraped source
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Run SP with excel source
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)
        print(df_excel.columns.tolist())
        print("Raw df_excel:\n", df_excel[df_excel['state_id'] == 35][['state_id', 'scrapped_value']])

        df_excel = df_excel.add_suffix('_excel')
        df_scraped = df_scraped.add_suffix('_scraped')
        df_scraped.rename(columns={
    'state_id_scraped': 'state_id',
    'KPI_ID_scraped': 'KPI_ID'
}, inplace=True)

        df_excel.rename(columns={
    'state_id_excel': 'state_id',
    'KPI_ID_excel': 'KPI_ID'
}, inplace=True)


        if df_scraped.empty and df_excel.empty:
            return JSONResponse(content={
                "stateReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        # Merge on state_id and kpi_id
        merge_keys = ["state_id", "KPI_ID"]
        df_combined = pd.merge(
            df_scraped,
            df_excel,
            on=merge_keys,
            suffixes=('_scraped', '_excel'),
            how='outer'
        )

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        output_data = {}
        for _, row in df_combined.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")

            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            # Raw value extraction
            critical_val = try_float(row.get("critical_api_value_scraped") or row.get("critical_api_value_excel"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            native_diff = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))

            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))

            scheme_val = try_float(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_pct = try_float(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            # Date fields
            critical_date = row.get("critical_api_scrapped_at_scraped") or row.get("critical_api_scrapped_at_excel")
            native_date = row.get("scrapped_value_date_of_data_scraped")
            excel_date = row.get("scrapped_value_date_of_data_excel")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")

            # Build entry
            entry = {
                "prayas_date_of_data": format_date_custom(critical_date),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,

                "nativeDashValue": format_number(native_val, two_decimal),
                "nativeDashDiff": format_number(native_diff, two_decimal),
                "nativeDashDiff_raw": native_diff,
                "nativeDashDiffPercent": format_percentage_with_min(native_pct),
                "nativeDashDiffPercent_raw": native_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "deptExcelValue": format_number(excel_val, two_decimal),
                "deptExcelDiff": format_number(excel_diff, two_decimal),
                "deptExcelDiff_raw": excel_diff,
                "deptExcelDiffPercent": format_percentage_with_min(excel_pct),
                "deptExcelDiffPercent_raw": excel_pct,
                "deptExcelRemark": row.get("Scrapped_crtical_Remarks_excel") or "NA",
                "deptExcelDate":format_date_custom(excel_date),

                "schemeDashValue": format_number(scheme_val, two_decimal),
                "schemeDashDiff": format_number(scheme_diff, two_decimal),
                "schemeDashDiff_raw": scheme_diff,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_pct),
                "schemeDashDiffPercent_raw": scheme_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                "scheme_date_of_data": format_date_custom(scheme_date),
                "date_of_data": format_date_custom(native_date or excel_date),
                "compare_date": format_date_custom(compare_date),

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = entry

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/state_district_diff_report")
def state_district_diff_report(input_data: DateInput, current_user: dict = Depends(get_current_user)):
    
    try:
        # Validate and parse the date
        filter_date_sql = parse_date(input_data.filter_date)
        

        # Create DB connection
        conn = create_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection error")

        cursor = conn.cursor()

        # Execute stored procedure with parameter safely
        cursor.execute("EXEC [sp_Check_District_State_Mismatch_By_Date] @input_date = ?", filter_date_sql)
        records = cursor.fetchall()

        if records:
            columns = [col[0] for col in cursor.description]
            df = pd.DataFrame.from_records(records, columns=columns)

            # Save to BytesIO
            excel_buffer = BytesIO()
            df.to_excel(excel_buffer, index=False, engine='openpyxl')
            excel_buffer.seek(0)

            return StreamingResponse(
                excel_buffer,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={"Content-Disposition": "attachment; filename=state_district_diff_report.xlsx"}
            )

        else:
            return {"message": "No records found."}

    except pyodbc.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    finally:
        # Ensure resources are always closed
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except:
            pass

@app.post("/api/national-historical-nested")
def fetch_nested_national_data(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]
    filter_date_sql = parse_date(input_data.filter_date)

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()

        # --- Fetch scraped data ---
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?, @Source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # --- Fetch excel data ---
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?, @Source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if df_scraped.empty and df_excel.empty:
            return JSONResponse(content={
                "nationalReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        # --- Merge both dataframes ---
        df_combined = pd.merge(
            df_scraped, df_excel,
            on=["KPI_ID", "national_id"],
            suffixes=('_scraped', '_excel'),
            how='outer'
        )

        # Format date fields
        for date_col in ['scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped',
                         'scheme_view_date_of_data_scraped', 'compare_date_scraped',
                         'scrapped_value_date_of_data_excel', 'critical_api_scrapped_at_excel',
                         'scheme_view_date_of_data_excel', 'compare_date_excel']:
            if date_col in df_combined.columns:
                df_combined[date_col] = df_combined[date_col].apply(format_date_custom)

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df_combined.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            national = row.get("national_name_scraped") or row.get("national_name_excel")

            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            # Critical API value (we prefer scraped, fallback to excel)
            critical_api_value_raw = try_float(row.get("critical_api_value_scraped")) or try_float(row.get("critical_api_value_excel"))
            formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)

            # Native (scraped) values
            native_value_raw = try_float(row.get("scrapped_value_scraped"))
            native_diff_raw = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_percent_raw = try_float(row.get("% Scrapped_crtical_Difference_scraped"))
            formatted_native_value = format_number(native_value_raw, two_decimal) if native_value_raw is not None else "NA"
            formatted_native_diff = format_number(native_diff_raw, two_decimal) if native_diff_raw is not None else "NA"
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw) if native_diff_percent_raw is not None else "NA"

            # Excel values
            excel_value_raw = try_float(row.get("scrapped_value_excel"))
            excel_diff_raw = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_percent_raw = try_float(row.get("% Scrapped_crtical_Difference_excel"))
            formatted_excel_value = format_number(excel_value_raw, two_decimal) if excel_value_raw is not None else "NA"
            formatted_excel_diff = format_number(excel_diff_raw, two_decimal) if excel_diff_raw is not None else "NA"
            formatted_excel_diff_percent = format_percentage_with_min(excel_diff_percent_raw) if excel_diff_percent_raw is not None else "NA"

            # Scheme values (prefer scraped)
            scheme_value_raw = try_float(row.get("scheme_view_value_scraped")) or try_float(row.get("scheme_view_value_excel"))
            scheme_diff_raw = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped")) or try_float(row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_percent_raw = try_float(row.get("% Scheme_crtical_Difference_scraped")) or try_float(row.get("% Scheme_crtical_Difference_excel"))
            formatted_scheme_value = format_number(scheme_value_raw, two_decimal) if scheme_value_raw is not None else "NA"
            formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal) if scheme_diff_raw is not None else "NA"
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw) if scheme_diff_percent_raw is not None else "NA"

            # Date handling
            prayas_date = row.get("critical_api_scrapped_at_scraped") or row.get("critical_api_scrapped_at_excel")
            native_date = row.get("scrapped_value_date_of_data_scraped")
            excel_date = row.get("scrapped_value_date_of_data_excel")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": prayas_date or "NA",
                "prayasValue": formatted_critical_api_value,
                "critical_api_value_raw": critical_api_value_raw,
                "nativeDashValue": formatted_native_value,
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "deptExcelValue": formatted_excel_value,
                "deptExcelDiff": formatted_excel_diff,
                "deptExcelDiffPercent": formatted_excel_diff_percent,
                "deptExcelDate":format_date_custom(excel_date),
                "schemeDashValue": formatted_scheme_value,
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",
                "date_of_data": native_date or excel_date or "NA",
                "scheme_date_of_data": scheme_date or "NA",
                "compare_date": compare_date or "NA",
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()  


@app.post("/api/district-historical-nested")
def fetch_nested_district_data(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            return float(val)
        except (ValueError, TypeError):
            return None

    def format_number(value: float, two_decimal: bool = False) -> str:
        if value is None or value == "NA":
            return "NA"
        try:
            return f"{value:.2f}" if two_decimal else f"{int(round(value))}"
        except ValueError:
            return "NA"

    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    try:
        cursor = conn.cursor()

        # --- 1st call: Scraped source ---
        cursor.execute("EXEC sp_historical_report_view_district @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # --- 2nd call: Excel source ---
        cursor.execute("EXEC sp_historical_report_view_district @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if df_scraped.empty and df_excel.empty:
            return JSONResponse(content={
                "districtReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        # --- Merge data ---
        df_merged = pd.merge(
            df_scraped, df_excel,
            on=["KPI_ID", "district_id"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        # Format date columns
        for col in ['scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped',
                    'scheme_view_date_of_data_scraped', 'compare_date_scraped',
                    'scrapped_value_date_of_data_excel', 'scheme_view_date_of_data_excel',
                    'compare_date_excel']:
            if col in df_merged.columns:
                df_merged[col] = df_merged[col].apply(format_date_custom)

        output_data = {}

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")
            district = row.get("district_name_scraped") or row.get("district_name_excel")

            if not all([scheme, kpi, state, district]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped values
            critical_val = get_number(row.get("critical_api_value_scraped"))
            native_val = get_number(row.get("scrapped_value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_scraped"))

            # Excel values
            excel_val = get_number(row.get("scrapped_value_excel"))
            excel_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme values
            scheme_val = get_number(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = get_number(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = get_number(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")
            scrap_date = row.get("scrapped_value_date_of_data_scraped")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            excel_date = row.get("scrapped_value_date_of_data_excel")

            output_data \
                .setdefault(scheme, {}) \
                .setdefault(kpi, {}) \
                .setdefault(state, {})[district] = {
                    "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped"),
                    "prayasValue": format_number(critical_val, two_decimal),
                    "critical_api_value_raw": critical_val,
                    "nativeDashValue": format_number(native_val, two_decimal),
                    "date_of_data": scrap_date,
                    "nativeDashDiff": format_number(native_diff_val, two_decimal),
                    "nativeDashDiff_raw": native_diff_val,
                    "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                    "nativeDashDiffPercent_raw": native_diff_pct,
                    "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                    "deptExcelValue": format_number(excel_val, two_decimal),
                    "deptExcelDiff": format_number(excel_diff_val, two_decimal),
                    "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                    "deptExcelDate":format_date_custom(excel_date),

                    "schemeDashValue": format_number(scheme_val, two_decimal),
                    "scheme_date_of_data": scheme_date,
                    "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                    "schemeDashDiff_raw": scheme_diff_val,
                    "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                    "schemeDashDiffPercent_raw": scheme_diff_pct,
                    "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                    "compare_date": compare_date,

                    "deptApiValue": "NA",
                    "deptApiDiff": "NA",
                    "deptApiDiffPercent": "NA"
                }

        return JSONResponse(content=jsonable_encoder({
            "districtReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/national-historical-nested-unit")
def fetch_nested_national_data_indian(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def try_float(val):
        try:
            return float(val)
        except:
            return None

    try:
        cursor = conn.cursor()

        # Scraped data
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Excel data
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if df_scraped.empty and df_excel.empty:
            return JSONResponse(content={
                "nationalReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        # Merge scraped and excel data
        df = pd.merge(df_scraped, df_excel, on=["KPI_ID","national_id"], how="outer", suffixes=('_scraped', '_excel'))

        for date_col in [
            'scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped', 'scheme_view_date_of_data_scraped', 'compare_date_scraped',
            'scrapped_value_date_of_data_excel', 'scheme_view_date_of_data_excel', 'compare_date_excel'
        ]:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            national = row.get("national_name_scraped") or row.get("national_name_excel")

            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped values
            critical_val = try_float(row.get("critical_api_value_scraped"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))

            # Excel values
            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme values
            scheme_val = try_float(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            scrap_date = row.get("scrapped_value_date_of_data_scraped")
            excel_date = row.get("scrapped_value_date_of_data_excel")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped"),
                "prayasValue": number_to_indian_currency_format(critical_val, False, two_decimal),
                "critical_api_value_raw": critical_val,

                "nativeDashValue": number_to_indian_currency_format(native_val, False, two_decimal),
                "date_of_data": scrap_date,
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, True, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "deptExcelValue": number_to_indian_currency_format(excel_val, False, two_decimal),
                "deptExcelDiff": number_to_indian_currency_format(excel_diff_val, True, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                "deptExcelDate":format_date_custom(excel_date),

                "schemeDashValue": number_to_indian_currency_format(scheme_val, False, two_decimal),
                "scheme_date_of_data": scheme_date,
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, True, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                "compare_date": compare_date,

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/state-historical-nested-unit")
def fetch_nested_state_data_unit_toggle(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def try_float(val):
        try:
            return float(val)
        except:
            return None

    try:
        cursor = conn.cursor()

        # Scraped data
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Excel data
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        

        # Merge both
        df = pd.merge(
            df_scraped,
            df_excel,
            on=["state_id", "KPI_ID"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        # Format date columns
        for date_col in [
            "scrapped_value_date_of_data_scraped", "scheme_view_date_of_data_scraped", "compare_date_scraped",
            "scrapped_value_date_of_data_excel", "scheme_view_date_of_data_excel", "compare_date_excel",
            "critical_api_scrapped_at_scraped"
        ]:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")

            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped values
            critical_val = try_float(row.get("critical_api_value_scraped"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))

            # Excel values
            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme values
            scheme_val = try_float(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            scrap_date = row.get("scrapped_value_date_of_data_scraped")
            excel_date = row.get("scrapped_value_date_of_data_excel")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped"),
                "prayasValue": number_to_indian_currency_format(critical_val, False, two_decimal),
                "critical_api_value_raw": critical_val,

                "nativeDashValue": number_to_indian_currency_format(native_val, False, two_decimal),
                "date_of_data": scrap_date,
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, True, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "deptExcelValue": number_to_indian_currency_format(excel_val, False, two_decimal),
                "deptExcelDiff": number_to_indian_currency_format(excel_diff_val, True, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                "deptExcelDate":format_date_custom(excel_date),

                "schemeDashValue": number_to_indian_currency_format(scheme_val, False, two_decimal),
                "scheme_date_of_data": scheme_date,
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, True, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                "compare_date": compare_date,

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/district-historical-nested-indian")
def fetch_nested_district_data_units(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    

    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            return float(val)
        except (ValueError, TypeError):
            return None

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_report_view_district @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]

        df = pd.DataFrame.from_records(records, columns=columns)

        if df.empty:
            return JSONResponse(content={
                "districtReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        for date_col in ['scrapped_value_date_of_data', 'critical_api_scrapped_at', 'scheme_view_date_of_data', 'compare_date']:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state_name = row.get("state_name")
            district_name = row.get("district_name")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

            critical_api_value_raw = get_number(row.get("critical_api_value"))
            native_value_raw = get_number(row.get("scrapped_value"))
            scheme_value_raw = get_number(row.get("scheme_view_value"))
            native_diff_raw = get_number(row.get("Scrapped_crtical_Absolute_Difference"))
            native_diff_percent_raw = get_number(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_raw = get_number(row.get("Scheme_crtical_Absolute_Difference"))
            scheme_diff_percent_raw = get_number(row.get("% Scheme_crtical_Difference"))

            

            formatted_critical_api_value = number_to_indian_currency_format(critical_api_value_raw, is_difference=False, two_decimal=two_decimal)
            formatted_native_value = number_to_indian_currency_format(native_value_raw, is_difference=False, two_decimal=two_decimal)
            formatted_scheme_value = number_to_indian_currency_format(scheme_value_raw, is_difference=False, two_decimal=two_decimal)
            formatted_native_diff = number_to_indian_currency_format(native_diff_raw, is_difference=True, two_decimal=two_decimal)
            formatted_scheme_diff = number_to_indian_currency_format(scheme_diff_raw, is_difference=True, two_decimal=two_decimal)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at"),
                "prayasValue": formatted_critical_api_value,
                "critical_api_value_raw": critical_api_value_raw,
                "nativeDashValue": formatted_native_value,
                "date_of_data": row.get("scrapped_value_date_of_data"),
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiff_raw": native_diff_raw,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashDiffPercent_raw": native_diff_percent_raw,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks"),
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": row.get("scheme_view_date_of_data"),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiff_raw": scheme_diff_raw,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashDiffPercent_raw": scheme_diff_percent_raw,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks"),
                "compare_date": row.get("Compare_date"),
                # "deptExcelValue": "NA",
                # "deptExcelDiff": "NA",
                # "deptExcelDiffPercent": "NA",
                # "deptApiValue": "NA",
                # "deptApiDiff": "NA",
                # "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "districtReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
class DateInput2(BaseModel):
    filter_date: str
    toggle: bool

class DateInput3(BaseModel):
    toggle: bool

@app.post("/api/state-detailed-nested-toggle")
def fetch_nested_state_data_indian(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        # Executing the stored procedure WITHOUT the filter_date
        cursor.execute("EXEC sp_latest_state_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_state_level_comparison @source=?", 'excel')
        records_excel = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns)

        join_cols = ['KPI_ID', 'State_ID']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')
        print(df.loc[df['KPI_ID'] == 1, 'Scrapped_Value_excel'])

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            state = row.get("State_Name_scraped")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = try_float(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))

            native_val = try_float(row.get("Scrapped_Value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped"))
            native_diff_pct = try_float(row.get("%_Scrapped_Critical_Diff_scraped"))

            native_value_excel = try_float(row.get("Scrapped_Value_excel"))
            native_diff_excel = try_float(row.get("Scrapped_Critical_Absolute_Diff_excel"))  
            native_diff_percent_excel = try_float(row.get("%_Scrapped_Critical_Diff_excel"))

            
            scheme_val = try_float(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_val = try_float(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))
            scheme_diff_pct = try_float(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": format_date_custom(row.get("Compare_Date_scraped")),
                "deptExcelValue": format_number(native_value_excel, two_decimal),
                "deptExcelDiff": format_number(native_diff_excel, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(native_diff_percent_excel),
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/state-detailed-nested-toggle-unit")
def fetch_nested_state_data_indian(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        # Executing the stored procedure WITHOUT the filter_date
        cursor.execute("EXEC sp_latest_state_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_state_level_comparison @source=?", 'excel')
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records, columns=columns)

        join_cols = ['KPI_ID', 'State_ID']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')

        
        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            state = row.get("State_Name_scraped")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = try_float(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))
            
            native_val = try_float(row.get("Scrapped_Value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped"))
            native_diff_pct = try_float(row.get("%_Scrapped_Critical_Diff_scraped"))

            native_value_excel = try_float(row.get("Scrapped_Value_scraped_excel"))
            native_diff_excel = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped_excel"))  
            native_diff_percent_excel = try_float(row.get("%_Scrapped_Critical_Diff_scraped_excel"))

            scheme_val = try_float(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_val = try_float(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))
            scheme_diff_pct = try_float(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "prayasValue":  number_to_indian_currency_format(critical_val, is_difference=True, two_decimal=two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": number_to_indian_currency_format(native_val, is_difference=True, two_decimal=two_decimal),
                "date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, is_difference=True, two_decimal=two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": number_to_indian_currency_format(scheme_val, is_difference=True, two_decimal=two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, is_difference=True, two_decimal=two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": format_date_custom(row.get("Compare_date_scraped")),
                "deptExcelValue": format_number(native_value_excel, two_decimal),
                "deptExcelDiff": format_number(native_diff_excel, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(native_diff_percent_excel),
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()     

@app.post("/api/national-detailed-nested-toggle")
def fetch_nested_national_data_toggle(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_latest_national_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_national_level_comparison @source=?", 'excel')
        records_excel = cursor.fetchall()
        print('excel data')
        print(records_excel)
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns)

        
        def try_float(val):
            try:
                return float(val)
            except:
                return None

        join_cols = ['KPI_ID', 'National_Name']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')
        print(df.loc[df['KPI_ID'] == 1, 'Scrapped_Value_excel'])
        
        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped', 'scheme_view_date_of_data_scraped', 'compare_date_scraped']:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            national = row.get("National_Name")
            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))
            
            native_value_raw = try_float(row.get("Scrapped_Value_scraped"))
            native_diff_raw = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped"))  
            native_diff_percent_raw = try_float(row.get("%_Scrapped_Critical_Diff_scraped"))
            
            native_value_raw_excel = try_float(row.get("Scrapped_Value_excel"))
            native_diff_raw_excel = try_float(row.get("Scrapped_Critical_Absolute_Diff_excel"))  
            native_diff_percent_raw_excel = try_float(row.get("%_Scrapped_Critical_Diff_excel"))
            
            scheme_value_raw = try_float(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_raw = try_float(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))
            scheme_diff_percent_raw = try_float(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel")) 

            formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)

            formatted_native_value = format_number(native_value_raw, two_decimal)
            formatted_native_diff = format_number(native_diff_raw, two_decimal)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)

            formatted_native_value_excel = format_number(native_value_raw_excel, two_decimal)
            formatted_native_diff_excel = format_number(native_diff_raw_excel, two_decimal)
            formatted_native_diff_percent_excel = format_percentage_with_min(native_diff_percent_raw_excel)

            formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
            formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "prayasValue": formatted_critical_api_value,
                "nativeDashValue": formatted_native_value,
                "date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiffPercent": formatted_native_diff_percent,

                "nativeDashValueExcel": formatted_native_value_excel,
                "nativeDashDiffExcel": formatted_native_diff_excel,
                "nativeDashDiffPercentExcel": formatted_native_diff_percent_excel,

                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": row.get("Compare_Date_scraped")
            }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/national-detailed-nested-toggle-unit")
def fetch_nested_national_data_toggle(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_latest_national_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_national_level_comparison @source=?", 'excel')
        records_excel = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns)

        join_cols = ['KPI_ID', 'National_Name']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')


        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped', 'scheme_view_date_of_data_scraped', 'compare_date_scraped']:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            national = row.get("National_Name")
            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))
            
            native_value_raw = try_float(row.get("Scrapped_Value_scraped"))
            native_diff_raw = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped"))
            native_diff_percent_raw = try_float(row.get("%_Scrapped_Critical_Diff_scraped"))

            native_value_raw_excel = try_float(row.get("Scrapped_Value_scraped_excel"))
            native_diff_raw_excel = try_float(row.get("Scrapped_Critical_Absolute_Diff_scraped_excel"))  
            native_diff_percent_raw_excel = try_float(row.get("%_Scrapped_Critical_Diff_scraped_excel"))    

            scheme_value_raw = try_float(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_raw = try_float(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))
            scheme_diff_percent_raw = try_float(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "prayasValue": number_to_indian_currency_format(critical_api_value_raw, False, two_decimal),
                "nativeDashValue": number_to_indian_currency_format(native_value_raw, False, two_decimal),
                "date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_raw, False, two_decimal),
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_percent_raw),

                "nativeDashValueExcel": number_to_indian_currency_format(native_value_raw_excel, False, two_decimal),
                "nativeDashDiffExcel": number_to_indian_currency_format(native_diff_raw_excel, False, two_decimal),
                "nativeDashDiffPercentExcel": format_percentage_with_min(native_diff_percent_raw_excel),

                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": number_to_indian_currency_format(scheme_value_raw, False, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date_scraped")),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_raw, False, two_decimal),
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_percent_raw),
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": row.get("Compare_date_scraped")
            }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@app.post("/api/district-detailed-nested-toggle")
def fetch_nested_district_data_toggle(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            return float(val)
        except (ValueError, TypeError):
            return None

    def format_number(value: float, two_decimal: bool = False) -> str:
        if value is None or value == "NA":
            return "NA"
        try:
            return f"{value:.2f}" if two_decimal else f"{int(round(value))}"
        except ValueError:
            return "NA"

    def format_percentage_with_min(value, min_val=0.01):
        if value is None:
            return "NA"
        r = round(value, 2)
        if r == 0 and value != 0:
            return min_val if value > 0 else -min_val
        return float(r)

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_latest_district_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_district_level_comparison @source=?", 'excel')
        records_excel = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns)

        join_cols = ['KPI_ID', 'District_ID']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')


        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['Compare_Date_scraped', 'Compare_Date_excel']:  # only this exists
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)


        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            state_name = row.get("State_Name_scraped")
            district_name = row.get("District_Name_scraped")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = get_number(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))
            
            
            
            #native_diff_val = get_number(row.get("Scrapped_Crtical_Absolute_Diff"))
            #scheme_diff_val = get_number(row.get("Prayas_Crtical_Absolute_Diff"))
            #native_diff_pct = get_number(row.get("% Scrapped_Crtical_Difference"))
            #scheme_diff_pct = get_number(row.get("% Prayas_Crtical_Difference"))
            native_val = get_number(row.get("Scrapped_Value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_Critical_Absolute_Diff_scraped"))
            native_diff_pct = get_number(row.get("%_Scrapped_Critical_Diff_scraped"))

            native_value_excel = get_number(row.get("Scrapped_Value_excel"))
            native_diff_excel = get_number(row.get("Scrapped_Critical_Absolute_Diff_excel"))  
            native_diff_percent_excel = get_number(row.get("%_Scrapped_Critical_Diff_excel"))

            scheme_val = get_number(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_val = get_number(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))  # exact match
            scheme_diff_pct = get_number(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel"))    # exact match

            

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("Compare_Date_scraped"),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": row.get("Compare_Date_scraped"),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": row.get("Compare_Date_scraped"),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": row.get("Compare_Date_scraped"),
                "deptExcelValue": format_number(native_value_excel, two_decimal),
                "deptExcelDiff": format_number(native_diff_excel, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(native_diff_percent_excel),
                # "deptApiValue": "NA",
                # "deptApiDiff": "NA",
                # "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "districtReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/district-detailed-nested-toggle-unit")
def fetch_nested_district_data_toggle(input_data: DateInput3, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            return float(val)
        except (ValueError, TypeError):
            return None

    def format_number(value: float, two_decimal: bool = False) -> str:
        if value is None or value == "NA":
            return "NA"
        try:
            return f"{value:.2f}" if two_decimal else f"{int(round(value))}"
        except ValueError:
            return "NA"

    

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_latest_district_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records, columns=columns)

        cursor.execute("EXEC sp_latest_district_level_comparison @source=?", 'excel')
        records_excel = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns)

        join_cols = ['KPI_ID', 'District_ID']
        df = pd.merge(df_scraped, df_excel, on=join_cols, suffixes=('_scraped', '_excel'),how = 'outer').fillna('NA')


        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['Compare_Date_scraped', 'Compare_Date_excel']:  # only this exists
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)


        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped")
            kpi = row.get("KPI_Name_scraped")
            state_name = row.get("State_Name_scraped")
            district_name = row.get("District_Name_scraped")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = get_number(row.get("Critical_API_Value_scraped")
    if pd.notnull(row.get("Critical_API_Value_scraped"))
    else row.get("Critical_API_Value_excel"))
            
            native_val = get_number(row.get("Scrapped_Value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_Critical_Absolute_Diff_scraped"))
            native_diff_pct = get_number(row.get("%_Scrapped_Critical_Diff_scraped"))

            native_value_excel = get_number(row.get("Scrapped_Value_excel"))
            native_diff_excel = get_number(row.get("Scrapped_Critical_Absolute_Diff_excel"))  
            native_diff_percent_excel = get_number(row.get("%_Scrapped_Critical_Diff_excel"))

            scheme_val = get_number(row.get("Prayas_Value_scraped") if pd.notnull(row.get("Prayas_Value_scraped"))
    else row.get("Prayas_Value_excel"))
            scheme_diff_val = get_number(row.get("Prayas_Critical_Absolute_Diff_scraped") if pd.notnull(row.get("Prayas_Critical_Absolute_Diff_scraped"))
    else row.get("Prayas_Critical_Absolute_Diff_excel"))
            scheme_diff_pct = get_number(row.get("%_Prayas_Critical_Diff_scraped") if pd.notnull(row.get("%_Prayas_Critical_Diff_scraped"))
    else row.get("%_Prayas_Critical_Diff_excel"))
        

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("Compare_Date_scraped"),
                "prayasValue":  number_to_indian_currency_format(critical_val, is_difference=True, two_decimal=two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue":  number_to_indian_currency_format(native_val, is_difference=True, two_decimal=two_decimal),
                "date_of_data": row.get("Compare_Date_scraped"),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue":  number_to_indian_currency_format(scheme_val, is_difference=True, two_decimal=two_decimal),
                "scheme_date_of_data": row.get("Compare_Date_scraped"),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",
                "compare_date": row.get("Compare_Date_scraped"),
                "deptExcelValue": format_number(native_value_excel, two_decimal),
                "deptExcelDiff": format_number(native_diff_excel, two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(native_diff_percent_excel),
                # "deptApiValue": "NA",
                # "deptApiDiff": "NA",
                # "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "districtReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()  

@app.post("/api/state-historical-nested-toggle")
def fetch_nested_state_data_indian(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]
    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()

        # 1st SP Call: Scraped
        cursor.execute("EXEC sp_historical_latest_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # 2nd SP Call: Excel
        cursor.execute("EXEC sp_historical_latest_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        # Exit early if toggle is False or no data
        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        # Merge on KPI_ID + state_id
        df_merged = pd.merge(
            df_scraped, df_excel,
            on=["KPI_ID", "state_id"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")

            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            # Values from 'scraped'
            critical_val = try_float(row.get("critical_api_value_scraped"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))

            # Values from 'excel'
            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme view (could come from either)
            scheme_val = try_float(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")
            scrap_date = row.get("scrapped_value_date_of_data_scraped")
            excel_date = row.get("scrapped_value_date_of_data_excel")
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at_scraped")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal) if native_val is not None else "NA",
                "nativeDashDiff": format_number(native_diff_val, two_decimal) if native_diff_val is not None else "NA",
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct) if native_diff_pct is not None else "NA",
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "deptExcelValue": format_number(excel_val, two_decimal) if excel_val is not None else "NA",
                "deptExcelDiff": format_number(excel_diff_val, two_decimal) if excel_diff_val is not None else "NA",
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct) if excel_diff_pct is not None else "NA",
                "deptExcelDate":format_date_custom(excel_date),

                "schemeDashValue": format_number(scheme_val, two_decimal) if scheme_val is not None else "NA",
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal) if scheme_diff_val is not None else "NA",
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct) if scheme_diff_pct is not None else "NA",
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                "scheme_date_of_data": format_date_custom(scheme_date),
                "compare_date": format_date_custom(compare_date),
                "date_of_data": format_date_custom(scrap_date),

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/state-historical-nested-toggle-unit")
def fetch_nested_state_data_indian(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()

        # Fetch scraped data
        cursor.execute("EXEC sp_historical_latest_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        cols_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=cols_scraped)

        # Fetch excel data
        cursor.execute("EXEC sp_historical_latest_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        cols_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=cols_excel)

        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        df_merged = pd.merge(
            df_scraped,
            df_excel,
            on=["state_id", "KPI_ID"],
            how="outer",
            suffixes=("_scraped", "_excel")
        )

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")

            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            # SCRAPED
            critical_val = try_float(row.get("critical_value_scraped"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            scheme_val = try_float(row.get("scheme_value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference_scraped"))

            # EXCEL
            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))
            excel_date = row.get("scrapped_value_date_of_data_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_scrapped_at_scraped")),
                "prayasValue": number_to_indian_currency_format(critical_val, is_difference=True, two_decimal=two_decimal),
                "critical_api_value_raw": critical_val,

                "nativeDashValue": number_to_indian_currency_format(native_val, is_difference=True, two_decimal=two_decimal),
                "date_of_data": format_date_custom(row.get("scrapped_value_date_scraped")),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, is_difference=True, two_decimal=two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "schemeDashValue": number_to_indian_currency_format(scheme_val, is_difference=True, two_decimal=two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("scheme_scrapped_at_scraped")),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, is_difference=True, two_decimal=two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",

                "compare_date": format_date_custom(row.get("compare_date_scraped")),

                "deptExcelValue": number_to_indian_currency_format(excel_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiff": number_to_indian_currency_format(excel_diff_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                "deptExcelDate":format_date_custom(excel_date),

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "stateReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/national-historical-nested-toggle")
def fetch_nested_national_data_indian(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val in (None, "NA", ""):
                return None
            return float(val)
        except:
            return None

    

    try:
        cursor = conn.cursor()

        # 1. Scraped data
        cursor.execute("EXEC sp_historical_latest_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # 2. Excel data
        cursor.execute("EXEC sp_historical_latest_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        # Merge both DataFrames on KPI ID
        df_merged = pd.merge(
            df_scraped,
            df_excel,
            on=["KPI_ID"],
            how="outer",
            suffixes=("_scraped", "_excel")
        )

        # Format all relevant dates
        for col in [
            "critical_scrapped_at_scraped", "scrapped_value_date_scraped", "scheme_scrapped_at_scraped",
            "critical_scrapped_at_excel", "scrapped_value_date_excel", "scheme_scrapped_at_excel",
            "compare_date_scraped", "compare_date_excel"
        ]:
            if col in df_merged.columns:
                df_merged[col] = df_merged[col].apply(format_date_custom)

        output_data = {}

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            if not all([scheme, kpi]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped values
            critical_val = get_number(row.get("critical_value_scraped"))
            native_val = get_number(row.get("scrapped_value_scraped"))
            scheme_val = get_number(row.get("scheme_value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_scraped"))
            scheme_diff_val = get_number(row.get("Scheme_crtical_Absolute_Difference_scraped"))
            scheme_diff_pct = get_number(row.get("% Scheme_crtical_Difference_scraped"))

            # Excel values
            excel_val = get_number(row.get("scrapped_value_excel"))
            excel_diff = get_number(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_pct = get_number(row.get("% Scrapped_crtical_Difference_excel"))
            excel_date = row.get("scrapped_value_date_of_data_excel")

            output_data \
                .setdefault(scheme, {}) \
                .setdefault(kpi, {})["India"] = {
                    "prayas_date_of_data": row.get("critical_scrapped_at_scraped"),
                    "prayasValue": format_number(critical_val, two_decimal),
                    "critical_api_value_raw": critical_val,

                    "nativeDashValue": format_number(native_val, two_decimal),
                    "date_of_data": row.get("scrapped_value_date_scraped"),
                    "nativeDashDiff": format_number(native_diff_val, two_decimal),
                    "nativeDashDiff_raw": native_diff_val,
                    "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                    "nativeDashDiffPercent_raw": native_diff_pct,
                    "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                    "deptExcelValue": format_number(excel_val, two_decimal),
                    "deptExcelDiff": format_number(excel_diff, two_decimal),
                    "deptExcelDiffPercent": format_percentage_with_min(excel_pct),
                    "deptExcelDate":format_date_custom(excel_date),

                    "schemeDashValue": format_number(scheme_val, two_decimal),
                    "scheme_date_of_data": row.get("scheme_scrapped_at_scraped"),
                    "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                    "schemeDashDiff_raw": scheme_diff_val,
                    "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                    "schemeDashDiffPercent_raw": scheme_diff_pct,
                    "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or "NA",

                    "compare_date": row.get("compare_date_scraped") or row.get("compare_date_excel"),

                    "deptApiValue": "NA",
                    "deptApiDiff": "NA",
                    "deptApiDiffPercent": "NA"
                }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
 
@app.post("/api/national-historical-nested-toggle-unit")
def fetch_nested_national_data_indian(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    print("Filter Date SQL:", filter_date_sql)
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def try_float(val):
        try:
            return float(val)
        except:
            return None

    try:
        cursor = conn.cursor()

        # Fetch Scraped Data
        cursor.execute("EXEC sp_historical_latest_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Fetch Excel Data
        cursor.execute("EXEC sp_historical_latest_report_view_national @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        # Merge on KPI ID (or "KPI_Name" if kpi_id doesn't exist)
        merge_cols = ["KPI_ID"] if "KPI_ID" in df_scraped.columns else ["KPI_Name"]
        df = pd.merge(df_scraped, df_excel, on=merge_cols, how="outer", suffixes=('_scraped', '_excel'))

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")

            if not all([scheme, kpi]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = try_float(row.get("critical_value_scraped"))
            native_val = try_float(row.get("scrapped_value_scraped"))
            scheme_val = try_float(row.get("scheme_value_scraped"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference_scraped"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_scraped"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference_scraped"))

            excel_val = try_float(row.get("scrapped_value_excel"))
            excel_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = try_float(row.get("% Scrapped_crtical_Difference_excel"))

            scheme_date = row.get("scheme_scrapped_at_scraped") or row.get("scheme_scrapped_at_excel")
            scrap_date = row.get("scrapped_value_date_scraped") 
            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")
            excel_date = row.get("scrapped_value_date_of_data_excel")

            output_data.setdefault(scheme, {}).setdefault(kpi, {})["India"] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_scrapped_at_scraped")),
                "prayasValue": number_to_indian_currency_format(critical_val, is_difference=True, two_decimal=two_decimal),
                "critical_api_value_raw": critical_val,

                "nativeDashValue": number_to_indian_currency_format(native_val, is_difference=True, two_decimal=two_decimal),
                "date_of_data": format_date_custom(scrap_date),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, is_difference=True, two_decimal=two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                "deptExcelValue": number_to_indian_currency_format(excel_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiff": number_to_indian_currency_format(excel_diff_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                "deptExcelDate":format_date_custom(excel_date),

                "schemeDashValue": number_to_indian_currency_format(scheme_val, is_difference=True, two_decimal=two_decimal),
                "scheme_date_of_data": format_date_custom(scheme_date),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, is_difference=True, two_decimal=two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                "compare_date": format_date_custom(compare_date),

                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return JSONResponse(content=jsonable_encoder({
            "nationalReportData": output_data,
            "kpiDetails": get_kpi_details(),
            "mappingData": get_scheme_kpi_mapping(),
            "date": input_data.filter_date
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Clean float values recursively
def clean_invalid_floats(obj):
    if isinstance(obj, dict):
        return {k: clean_invalid_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_invalid_floats(i) for i in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, str):
        if obj.lower() in ['nan', 'inf', '-inf']:
            return None
        return obj
    else:
        return obj

# Safe JSON wrapper
def safe_json_response(data):
    try:
        cleaned = clean_invalid_floats(data)
        json_str = json.dumps(cleaned, allow_nan=False)
        return JSONResponse(content=json.loads(json_str))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Invalid float in response: {e}")
@app.post("/api/district-historical-nested-toggle")
def fetch_nested_district_data_toggle(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            return float(val)
        except (ValueError, TypeError):
            return None

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            num = float(val)
            if math.isnan(num) or math.isinf(num):
                return None
            return num
        except (ValueError, TypeError):
            return None

    try:
        cursor = conn.cursor()

        # 1. Scraped data
        cursor.execute("EXEC sp_historical_latest_district_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # 2. Excel data
        cursor.execute("EXEC sp_historical_latest_district_report_view @Filterdate = ?, @source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        # Merge scraped and excel
        df_merged = pd.merge(
            df_scraped,
            df_excel,
            on=["KPI_ID", "district_id"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        # Format date columns
        for date_col in [
            "scrapped_value_date_of_data_scraped", "scheme_view_date_of_data_scraped", "compare_date_scraped",
            "scrapped_value_date_of_data_excel", "scheme_view_date_of_data_excel", "compare_date_excel",
            "critical_api_scrapped_at_scraped"
        ]:
            if date_col in df_merged.columns:
                df_merged[date_col] = df_merged[date_col].apply(format_date_custom)

        output_data = {}
        df_merged.replace([float('inf'), float('-inf'), float('nan')], None, inplace=True)
        df_merged = df_merged.where(pd.notnull(df_merged), None)

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state = row.get("state_name_scraped") or row.get("state_name_excel")
            district = row.get("district_name_scraped") or row.get("district_name_excel")

            if not all([scheme, kpi, state, district]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped
            critical_val = get_number(row.get("critical_api_value_scraped"))
            native_val = get_number(row.get("scrapped_value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_scraped"))

            # Excel
            excel_val = get_number(row.get("scrapped_value_excel"))
            excel_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme
            scheme_val = get_number(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = get_number(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = get_number(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            compare_date = row.get("compare_date_scraped") or row.get("compare_date_excel")
            scrap_date = row.get("scrapped_value_date_of_data_scraped") 
            scheme_date = row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")
            excel_date = row.get("scrapped_value_date_of_data_excel")

            output_data \
                .setdefault(scheme, {}) \
                .setdefault(kpi, {}) \
                .setdefault(state, {})[district] = {
                    "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped"),
                    "prayasValue": format_number(critical_val, two_decimal),
                    "critical_api_value_raw": critical_val,

                    "nativeDashValue": format_number(native_val, two_decimal),
                    "date_of_data": scrap_date,
                    "nativeDashDiff": format_number(native_diff_val, two_decimal),
                    "nativeDashDiff_raw": native_diff_val,
                    "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                    "nativeDashDiffPercent_raw": native_diff_pct,
                    "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

                    "deptExcelValue": format_number(excel_val, two_decimal),
                    "deptExcelDiff": format_number(excel_diff_val, two_decimal),
                    "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                    "deptExcelDate":format_date_custom(excel_date),

                    "schemeDashValue": format_number(scheme_val, two_decimal),
                    "scheme_date_of_data": scheme_date,
                    "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                    "schemeDashDiff_raw": scheme_diff_val,
                    "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                    "schemeDashDiffPercent_raw": scheme_diff_pct,
                    "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

                    "compare_date": compare_date,

                    "deptApiValue": "NA",
                    "deptApiDiff": "NA",
                    "deptApiDiffPercent": "NA"
                }

        return safe_json_response({
    "districtReportData": output_data,
    "kpiDetails": get_kpi_details(),
    "mappingData": get_scheme_kpi_mapping(),
    "date": input_data.filter_date
})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@app.post("/api/district-historical-nested-unit")
def fetch_nested_district_data_units(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            num = float(val)
            if math.isnan(num) or math.isinf(num):
                return None
            return num
        except (ValueError, TypeError):
            return None
    def safe_format_number(val, two_decimal=False):
        num = get_number(val)
        if num is None:
            return "NA"
        return f"{num:,.2f}" if two_decimal else f"{int(num):,}"
    def safe_date(val):
        return format_date_custom(val) if val else "NA"

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()

        # Fetch scraped data
        cursor.execute("EXEC sp_historical_report_view_district @Filterdate = ?, @Source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Fetch Excel data
        cursor.execute("EXEC sp_historical_report_view_district @Filterdate = ?, @Source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        # Merge on district_id and KPI_ID (adjust if necessary)
        df = pd.merge(
            df_scraped,
            df_excel,
            on=["district_id", "KPI_ID"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        for date_col in [
            'scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped',
            'scheme_view_date_of_data_scraped', 'compare_date_scraped',
            'scrapped_value_date_of_data_excel', 'scheme_view_date_of_data_excel',
            'compare_date_excel'
        ]:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        output_data = {}
        df_merged.replace([float('inf'), float('-inf'), float('nan')], None, inplace=True)
        df_merged = df_merged.where(pd.notnull(df_merged), None)

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state_name = row.get("state_name_scraped") or row.get("state_name_excel")
            district_name = row.get("district_name_scraped") or row.get("district_name_excel")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

# Raw values (for *_raw keys)
            critical_api_value_raw = get_number(row.get("critical_api_value_scraped"))
            native_diff_raw = get_number(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_percent_raw = get_number(row.get("% Scrapped_crtical_Difference_scraped"))
            scheme_diff_raw = get_number(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_percent_raw = get_number(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            # Formatted values
            formatted_critical_api_value = safe_format_number(critical_api_value_raw, two_decimal)
            formatted_native_value = safe_format_number(row.get("scrapped_value_scraped"), two_decimal)
            formatted_native_diff = safe_format_number(native_diff_raw, two_decimal)
            formatted_native_diff_percent = safe_format_number(native_diff_percent_raw, True)
            formatted_scheme_value = safe_format_number(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"), two_decimal)
            formatted_scheme_diff = safe_format_number(scheme_diff_raw, two_decimal)
            formatted_scheme_diff_percent = safe_format_number(scheme_diff_percent_raw, True)

            formatted_excel_value = safe_format_number(row.get("scrapped_value_excel"), two_decimal)
            formatted_excel_diff = safe_format_number(row.get("Scrapped_crtical_Absolute_Difference_excel"), two_decimal)
            formatted_excel_diff_percent = safe_format_number(row.get("% Scrapped_crtical_Difference_excel"), True)

            excel_date = row.get("scrapped_value_date_of_data_excel")


            output_data \
    .setdefault(scheme, {}) \
    .setdefault(kpi, {}) \
    .setdefault(state, {})[district] = {
        "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped") or "NA",
        "prayasValue": formatted_critical_api_value,
        "critical_api_value_raw": critical_api_value_raw,

        "nativeDashValue": formatted_native_value,
        "date_of_data": safe_date(row.get("scrapped_value_date_of_data_scraped")),
        "nativeDashDiff": formatted_native_diff,
        "nativeDashDiff_raw": native_diff_raw,
        "nativeDashDiffPercent": formatted_native_diff_percent,
        "nativeDashDiffPercent_raw": native_diff_percent_raw,
        "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",

        "schemeDashValue": formatted_scheme_value,
        "scheme_date_of_data": safe_date(row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel")),
        "schemeDashDiff": formatted_scheme_diff,
        "schemeDashDiff_raw": scheme_diff_raw,
        "schemeDashDiffPercent": formatted_scheme_diff_percent,
        "schemeDashDiffPercent_raw": scheme_diff_percent_raw,
        "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",

        "compare_date": safe_date(row.get("compare_date_scraped") or row.get("compare_date_excel")),

        "deptExcelValue": formatted_excel_value,
        "deptExcelDiff": formatted_excel_diff,
        "deptExcelDiffPercent": formatted_excel_diff_percent,
        "deptExcelDate": safe_date(excel_date),

        "deptApiValue": "NA",
        "deptApiDiff": "NA",
        "deptApiDiffPercent": "NA"
    }


        return safe_json_response({
    "districtReportData": output_data,
    "kpiDetails": get_kpi_details(),
    "mappingData": get_scheme_kpi_mapping(),
    "date": input_data.filter_date
})


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
@app.post("/api/district-historical-nested-toggle-unit")
def fetch_nested_district_data_toggle(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = [
        "Disbursed Loan Amount",
        "Expenditure",
        "Road Built 2014-23"
    ]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    def get_number(val):
        try:
            if val is None or val == "NA" or val == "":
                return None
            num = float(val)
            if math.isnan(num) or math.isinf(num):
                return None
            return num
        except (ValueError, TypeError):
            return None

    filter_date_sql = parse_date(input_data.filter_date)

    try:
        cursor = conn.cursor()

        # Fetch scraped data
        cursor.execute("EXEC sp_historical_latest_district_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'scraped')
        records_scraped = cursor.fetchall()
        columns_scraped = [col[0] for col in cursor.description]
        df_scraped = pd.DataFrame.from_records(records_scraped, columns=columns_scraped)

        # Fetch excel data
        cursor.execute("EXEC sp_historical_latest_district_report_view @Filterdate = ?, @Source = ?", filter_date_sql, 'excel')
        records_excel = cursor.fetchall()
        columns_excel = [col[0] for col in cursor.description]
        df_excel = pd.DataFrame.from_records(records_excel, columns=columns_excel)

        if not input_data.toggle or (df_scraped.empty and df_excel.empty):
            return Response(status_code=204)

        df_merged= pd.merge(
            df_scraped,
            df_excel,
            on=["district_id", "KPI_ID"],
            how="outer",
            suffixes=('_scraped', '_excel')
        )

        for date_col in [
            'scrapped_value_date_of_data_scraped', 'critical_api_scrapped_at_scraped',
            'scheme_view_date_of_data_scraped', 'compare_date_scraped',
            'scrapped_value_date_of_data_excel', 'scheme_view_date_of_data_excel', 'compare_date_excel'
        ]:
            if date_col in df_merged.columns:
                df_merged[date_col] = df_merged[date_col].apply(format_date_custom)

        output_data = {}
        df_merged.replace([float('inf'), float('-inf'), float('nan')], None, inplace=True)
        df_merged = df_merged.where(pd.notnull(df_merged), None)

        for _, row in df_merged.iterrows():
            scheme = row.get("Scheme_Name_scraped") or row.get("Scheme_Name_excel")
            kpi = row.get("KPI_Name_scraped") or row.get("KPI_Name_excel")
            state_name = row.get("state_name_scraped") or row.get("state_name_excel")
            district_name = row.get("district_name_scraped") or row.get("district_name_excel")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

            # Scraped
            critical_val = get_number(row.get("critical_api_value_scraped"))
            native_val = get_number(row.get("scrapped_value_scraped"))
            native_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_scraped"))
            native_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_scraped"))

            # Excel
            excel_val = get_number(row.get("scrapped_value_excel"))
            excel_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference_excel"))
            excel_diff_pct = get_number(row.get("% Scrapped_crtical_Difference_excel"))

            # Scheme
            scheme_val = get_number(row.get("scheme_view_value_scraped") or row.get("scheme_view_value_excel"))
            scheme_diff_val = get_number(row.get("Scheme_crtical_Absolute_Difference_scraped") or row.get("Scheme_crtical_Absolute_Difference_excel"))
            scheme_diff_pct = get_number(row.get("% Scheme_crtical_Difference_scraped") or row.get("% Scheme_crtical_Difference_excel"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at_scraped"),
                "prayasValue": number_to_indian_currency_format(critical_val, is_difference=True, two_decimal=two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": number_to_indian_currency_format(native_val, is_difference=True, two_decimal=two_decimal),
                "date_of_data": row.get("scrapped_value_date_of_data_scraped") or row.get("scrapped_value_date_of_data_excel"),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, is_difference=True, two_decimal=two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks_scraped") or "NA",
                "schemeDashValue": number_to_indian_currency_format(scheme_val, is_difference=True, two_decimal=two_decimal),
                "scheme_date_of_data": row.get("scheme_view_date_of_data_scraped") or row.get("scheme_view_date_of_data_excel"),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, is_difference=True, two_decimal=two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks_scraped") or row.get("Scheme_crtical_Remarks_excel") or "NA",
                "compare_date": row.get("compare_date_scraped") or row.get("compare_date_excel"),
                "deptExcelValue": number_to_indian_currency_format(excel_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiff": number_to_indian_currency_format(excel_diff_val, is_difference=True, two_decimal=two_decimal),
                "deptExcelDiffPercent": format_percentage_with_min(excel_diff_pct),
                "deptExcelDate": format_date_custom(row.get("scrapped_value_date_of_data_excel")),
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA"
            }

        return safe_json_response({
    "districtReportData": output_data,
    "kpiDetails": get_kpi_details(),
    "mappingData": get_scheme_kpi_mapping(),
    "date": input_data.filter_date
})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

from fastapi import Depends
from fastapi.responses import JSONResponse
from collections import defaultdict

@app.get("/api/get_level_scheme_kpi")
async def get_level_scheme_kpi(current_user: dict = Depends(get_current_user)):
    try:
        conn = create_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT Granularity, Scheme_Name, KPI_Name FROM KPI_master")
        rows = cursor.fetchall()

    except Exception as e:
        print(str(e))
        return {"status": 500, "error": "Internal server error occurred."}

    levels_set = set()
    schemes = defaultdict(set)
    kpis = defaultdict(lambda: defaultdict(set))  # Nested dict: granularity -> scheme -> set of KPIs

    for row in rows:
        granularity = row.Granularity.strip()
        scheme = row.Scheme_Name.strip()
        kpi = row.KPI_Name.strip()

        levels_set.add(granularity)
        schemes[granularity].add(scheme)
        kpis[granularity][scheme].add(kpi)

    # Convert sets to sorted lists
    response = {
        "levels": sorted(list(levels_set)),
        "schemes": {
            level: sorted(list(schemes[level]))
            for level in schemes
        },
        "kpis": {
            level: {
                scheme: sorted(list(kpis[level][scheme]))
                for scheme in kpis[level]
            }
            for level in kpis
        }
    }

    return JSONResponse(content=response)


# Request body model
class TemplateRequest(BaseModel):
    level: str
    scheme_name: str
    kpi_name: str

@app.post("/api/download_excel_template")
async def download_excel_template(payload: TemplateRequest, current_user: dict = Depends(get_current_user)):
    """
    {
        "level": "state",
        "scheme_name": "SVAMITVA",
        "kpi_name": "No. of Property Cards Distributed"
    }
    """
    
    level = payload.level.lower()
    scheme_name = payload.scheme_name
    kpi_name = payload.kpi_name
    connection = create_db_connection()
    
    # SQL Queries
    with connection as conn:
        if level == "district":
            query = """
                SELECT s.state_id, s.state_name, d.district_id, d.district_name
                FROM [Prayas_Data_Sanity1].[dbo].[District_Level] d
                JOIN [Prayas_Data_Sanity1].[dbo].[State_Level] s ON d.state_id = s.state_id order by s.state_name
            """
            df = pd.read_sql(query, conn)
            df_template = pd.DataFrame({
                #"State ID": df["state_id"],
                "State Name": df["state_name"],
                #"District ID": df["district_id"],
                "District Name": df["district_name"],
                "Scheme Name": [scheme_name] * len(df),
                "KPI Name": [kpi_name] * len(df),
                "Date of Data": ["" for _ in range(len(df))],
                "District Value": ["" for _ in range(len(df))],
                "":["" for _ in range(len(df))],
                "Note": ["* Format to enter date - dd-mm-yyyyy", "* All the values to be in absolute numbers", "* Data of other KPIs to submitted via separate excel", "* Data of other dates to be submitted via separate excel"] + [""] * (len(df) - 4)

            })
        elif level == "state":
            query = "SELECT state_id, state_name FROM State_Level order by state_name"
            df = pd.read_sql(query, conn)
            df_template = pd.DataFrame({
                #"State ID": df["state_id"],
                "State Name": df["state_name"],
                "Scheme Name": [scheme_name] * len(df),
                "KPI Name": [kpi_name] * len(df),
                "Date of Data": ["" for _ in range(len(df))],
                "State Value": ["" for _ in range(len(df))],
                "":["" for _ in range(len(df))],
                "Note": ["* Format to enter date - dd-mm-yyyyy", "* All the values to be in absolute numbers", "* Data of other KPIs to submitted via separate excel", "* Data of other dates to be submitted via separate excel"] + [""] * (len(df) - 4)

            })
        elif level == "national":
            query = "Select national_id, national_name from National_Level"
            df = pd.read_sql(query, conn)
            print(df)
            print(len(df))
            df_template = pd.DataFrame({
                #"National ID": df["national_id"],
                "National Name": df["national_name"],
                "Scheme Name": [scheme_name] * len(df),
                "KPI Name": [kpi_name] * len(df),
                "Date of Data": ["" for _ in range(len(df))],
                "National Value": ["" for _ in range(len(df))]
               
            })
        else:
            return {"error": "Invalid level. Must be 'national', 'state' or 'district'."}

    

    # Write to Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df_template.to_excel(writer, index=False, sheet_name='Sheet1')
        workbook  = writer.book
        worksheet = writer.sheets["Sheet1"]

        # Auto-adjust column widths
        for i, col in enumerate(df_template.columns):
            # Get max length of content in column including header
            column_len = max(df_template[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.set_column(i, i, column_len)
        
        

    output.seek(0)
    file_name = 'template_district.xlsx' if level == "district" else 'template_state.xlsx' if level == 'state' else 'template_national.xlsx'
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={file_name}"
        }
    )


@app.post("/api/upload_excel_state_data")
async def upload_excel_state_data(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
   # Read Excel content
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        return {"status": 400, "error": f"Failed to read Excel file: {str(e)}"}
    
    df.columns = [col.strip() for col in df.columns]

    required_cols = [
            "State Name", "Scheme Name", "KPI Name", "Date of Data", "State Value"
        ]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column: {col}")
    
    # Check for any row with empty 'Date of Data' or 'State Value'
    if df["Date of Data"].isnull().any() or df["State Value"].isnull().any():
        raise HTTPException(
            status_code=400,
            detail="One or more rows are missing 'Date of Data' or 'State Value'. Please fix and upload again."
        )
        
    try:
        conn = create_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(str(e))
        return {"status": 500, "error": "Some internal server error occured."}
    insert_data = []
    df["kpi_id"] = None
    df["state_id"] = None
    for index, row in df.iterrows():
        state = str(row["State Name"]).strip()
        scheme_name = str(row["Scheme Name"]).strip()
        kpi_name = str(row["KPI Name"]).strip()
        value = row["State Value"]
        source = "excel"
        remarks = None
        print(f'state:{state}, value:{value}')

        # Parse date of data
        try:
            date_of_data = pd.to_datetime(row["Date of Data"], dayfirst=True)
            df.at[index, "Date of Data"] = date_of_data
            print(date_of_data)
        except Exception:
            continue  # skip invalid dates

        # Get kpi_id
        cursor.execute(
            "SELECT kpi_id FROM KPI_Master WHERE KPI_Name = ? and Scheme_Name= ?", kpi_name, scheme_name
        )
        kpi_row = cursor.fetchone()
        if not kpi_row:
            continue
        kpi_id = kpi_row[0]
        df.at[index, "kpi_id"] = kpi_id
        # Get district_id
        cursor.execute(
            """SELECT state_id FROM State_Level where state_name = ?""",
            (state)
        )
        level_id = cursor.fetchone()
        if not level_id:
            continue
        state_id = level_id[0]
        df.at[index, "state_id"] = state_id

        insert_data.append((kpi_id, state_id, value, date_of_data, remarks, source))

    # Bulk insert using executemany
    if insert_data:
        cursor.executemany("""
            INSERT INTO Scrapped_State_Level (
                kpi_id, state_id, value, scrapped_at, Date_Of_Data, Remarks, source
            ) VALUES (?, ?, ?, GETDATE(), ?, ?, ?)
        """, insert_data)
        conn.commit()

    # Prepare for national aggregation
    df_filtered = df.dropna(subset=["kpi_id", "state_id", "State Value", "Date of Data"])

    # Group by kpi_id to get sum and latest date
    df_sum = df_filtered.groupby("kpi_id")["State Value"].sum().reset_index()
    df_latest_date = df_filtered.groupby("kpi_id")["Date of Data"].max().reset_index()
    df_national = pd.merge(df_sum, df_latest_date, on="kpi_id")
    df_national["scrapped_at"] = pd.Timestamp.now()
    df_national["Remarks"] = None
    df_national["source"] = "excel"

    # Get national_id
    cursor.execute("SELECT TOP 1 national_id FROM National_Level")
    national_row = cursor.fetchone()
    if not national_row:
        raise HTTPException(status_code=500, detail="National ID not found.")
    national_id = national_row[0]

    # Insert into Scrapped_National_Level
    insert_national_data = []
    for _, row in df_national.iterrows():
        insert_national_data.append((
            int(row["kpi_id"]),
            national_id,
            float(row["State Value"]),
            row["scrapped_at"],
            row["Date of Data"],
            row["Remarks"],
            row["source"]
        ))

    if insert_national_data:
        cursor.executemany("""
            INSERT INTO Scrapped_National_Level (
                kpi_id, national_id, value, scrapped_at, Date_Of_Data, Remarks, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, insert_national_data)
        conn.commit()

    cursor.close()
    conn.close()

    return {
            "status": 200,
            "message": "Success",
            "state_rows_inserted": len(insert_data),
            "national_rows_inserted": len(insert_national_data)
        }  
    

@app.post("/api/upload_excel_national_data")
async def upload_excel_national_data(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    # Read Excel content
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        return {"status": 400, "error": f"Failed to read Excel file: {str(e)}"}
    
    df.columns = [col.strip() for col in df.columns]

    required_cols = [
            "National ID", "National Name", "Scheme Name", "KPI Name", "Date of Data", "National Value"
        ]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column: {col}")
        
    # Check for any row with empty 'Date of Data' or 'State Value'
    if df["Date of Data"].isnull().any() or df["National Value"].isnull().any():
        raise HTTPException(
            status_code=400,
            detail="One or more rows are missing 'Date of Data' or 'National Value'. Please fix and upload again."
        )
        
    try:
        conn = create_db_connection()
        cursor = conn.cursor()
        insert_data = []
        for index, row in df.iterrows():
            national_name = str(row["National Name"]).strip()
            scheme_name = str(row["Scheme Name"]).strip()
            kpi_name = str(row["KPI Name"]).strip()
            value = row["National Value"]
            source = "excel"
            remarks = None

            # Parse date of data
            try:
                date_of_data = pd.to_datetime(row["Date of Data"], dayfirst=True)
                print(date_of_data)
            except Exception:
                continue  # skip invalid dates

            # Get kpi_id
            cursor.execute(
                "SELECT kpi_id FROM KPI_Master WHERE KPI_Name = ? and Scheme_Name= ?", kpi_name, scheme_name
            )
            kpi_row = cursor.fetchone()
            if not kpi_row:
                continue
            kpi_id = kpi_row[0]
            # Get district_id
            cursor.execute(
                """SELECT national_id FROM National_Level where national_name = ?""",
                (national_name)
            )
            level_id = cursor.fetchone()
            if not level_id:
                continue
            national_id = level_id[0]

            insert_data.append((kpi_id, national_id, value, date_of_data, remarks, source))

        # Bulk insert using executemany
        if insert_data:
            cursor.executemany("""
                INSERT INTO Scrapped_National_Level (
                    kpi_id, national_id, value, scrapped_at, Date_Of_Data, Remarks, source
                ) VALUES (?, ?, ?, GETDATE(), ?, ?, ?)
            """, insert_data)
            conn.commit()

        cursor.close()
        conn.close()

        return {"status": "success", "rows_inserted": len(insert_data)}


    except Exception as e:
        print(str(e))
        return {"status": 500, "error": "Internal server error occured."}
    

@app.post("/api/upload_excel_district_data")
async def upload_excel_district_data(current_user: dict = Depends(get_current_user), file: UploadFile = File(...)):
    # Read Excel content
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        print(str(e))
        return {"status": 400, "error": f"Failed to read Excel file."}
    
    df.columns = [col.strip() for col in df.columns]

    required_cols = [
            "State Name", "District Name",
            "Scheme Name", "KPI Name", "Date of Data", "District Value"
        ]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column: {col}")
        
    # Check for any row with empty 'Date of Data' or 'State Value'
    if df["Date of Data"].isnull().any() or df["District Value"].isnull().any():
        raise HTTPException(
            status_code=400,
            detail="One or more rows are missing 'Date of Data' or 'District Value'. Please fix and upload again."
        )
        
    try:
        conn = create_db_connection()
        cursor = conn.cursor()

        df["kpi_id"] = None
        df["district_id"] = None
        df["state_id"] = None

        insert_data = []
        for index, row in df.iterrows():
            state = str(row["State Name"]).strip()
            district = str(row["District Name"]).strip()
            scheme_name = str(row["Scheme Name"]).strip()
            kpi_name = str(row["KPI Name"]).strip()
            value = row["District Value"]
            source = "excel"
            remarks = None

            # Parse date of data
            try:
                date_of_data = pd.to_datetime(row["Date of Data"], dayfirst=True)
                df.at[index, "Date of Data"] = date_of_data
            except Exception:
                continue  # skip invalid dates

            # Get kpi_id
            cursor.execute(
                "SELECT kpi_id FROM KPI_Master WHERE KPI_Name = ? and Scheme_Name= ?", kpi_name, scheme_name
            )
            kpi_row = cursor.fetchone()
            if not kpi_row:
                continue
            kpi_id = kpi_row[0]
            df.at[index, "kpi_id"] = kpi_id
            # Get district_id
            cursor.execute(
                """SELECT district_id, state_id FROM District_Level where district_name = ?""",
                (district)
            )
            level_ids = cursor.fetchone()
            if not level_ids:
                continue

            district_id, state_id = level_ids
            df.at[index, "district_id"] = district_id
            df.at[index, "state_id"] = state_id

            insert_data.append((kpi_id, district_id, value, date_of_data, state_id, remarks, source))

        # Bulk insert using executemany
        if insert_data:
            cursor.executemany("""
                INSERT INTO scrapped_district_level (
                    kpi_id, district_id, value, scrapped_at, Date_Of_Data, state_id, Remarks, source
                ) VALUES (?, ?, ?, GETDATE(), ?, ?, ?, ?)
            """, insert_data)
            conn.commit()

        # Remove rows with nulls before aggregation
        df_filtered = df.dropna(subset=["kpi_id", "state_id", "District Value", "Date of Data"])

        # Group by kpi_id and state_id and sum district values
        df_sum = df_filtered.groupby(
            ["kpi_id", "state_id"]
        )["District Value"].sum().reset_index()

        # Get the latest date_of_data per (kpi_id, state_id)
        df_latest_date = df_filtered.groupby(["kpi_id", "state_id"])["Date of Data"].max().reset_index()

        # Merge sum and latest date
        df_state = pd.merge(df_sum, df_latest_date, on=["kpi_id", "state_id"])

        df_state["scrapped_at"] = pd.Timestamp.now()
        df_state["Remarks"] = None
        df_state["source"] = "excel"

        # Insert into Scrapped_State_Level
        insert_state_data = []
        for _, row in df_state.iterrows():
            insert_state_data.append((
                int(row["kpi_id"]),
                int(row["state_id"]),
                float(row["District Value"]),
                row["scrapped_at"],
                row["Date of Data"],
                row["Remarks"],
                row["source"]
            ))

        if insert_state_data:
            cursor.executemany("""
                INSERT INTO Scrapped_State_Level (
                    kpi_id, state_id, value, scrapped_at, Date_Of_Data, Remarks, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, insert_state_data)
            conn.commit()

        #NATIONAL-LEVEL AGGREGATION
        df_nat_sum = df_state.groupby("kpi_id")["District Value"].sum().reset_index()
        df_nat_date = df_state.groupby("kpi_id")["Date of Data"].max().reset_index()
        df_national = pd.merge(df_nat_sum, df_nat_date, on="kpi_id")
        df_national["scrapped_at"] = pd.Timestamp.now()
        df_national["Remarks"] = None
        df_national["source"] = "excel"

        # Fetch national_id once from National_Level table
        cursor.execute("SELECT TOP 1 national_id FROM National_Level")
        national_id_row = cursor.fetchone()
        if not national_id_row:
            raise HTTPException(status_code=500, detail="National ID not found in National_Level table.")
        national_id = national_id_row[0]
        # Insert into Scrapped_National_Level
        insert_national_data = []
        for _, row in df_national.iterrows():
            insert_national_data.append((
                int(row["kpi_id"]),
                national_id,
                float(row["District Value"]),
                row["scrapped_at"],
                row["Date of Data"],
                row["Remarks"],
                row["source"]
            ))
        if insert_national_data:
            cursor.executemany("""
                INSERT INTO Scrapped_National_Level (
                    kpi_id, national_id, value, scrapped_at, Date_Of_Data, Remarks, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, insert_national_data)
            conn.commit()

        cursor.close()
        conn.close()

        return {
            "status": 200,
            "message": "Success",
            "district_rows_inserted": len(insert_data),
            "state_rows_inserted": len(insert_state_data),
            "national_rows_inserted": len(insert_national_data)
        }


    except Exception as e:
        print(str(e))
        return {"status": 500, "error": "Internal server error occured"}
    
@app.post("/api/get_state_district_mismatch_records")
def get_state_district_mismatch_records(input_data: DateInput, current_user: dict = Depends(get_current_user)):
    
    try:
        # Connect to DB
        conn = create_db_connection()
        cursor = conn.cursor()

        input_date = parse_date(input_data.filter_date)

        # Execute the stored procedure with the input date
        cursor.execute("EXEC sp_Check_District_State_Mismatch_By_Date @input_date = ?", input_date)
        
        # Get column names
        columns = [col[0] for col in cursor.description]
        # Convert rows to list of dicts
        #results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        rows = cursor.fetchall()
        results = []
        for row in rows:
            row_dict = dict(zip(columns, row))

            # Format specified columns using format_number
            for key in ["State Value", "Sum of Districts", "Difference"]:
                if key in row_dict:
                    row_dict[key] = format_number(row_dict[key])

            results.append(row_dict)


        return {"status": 200, "data": results}

    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail="Internal server error occurred.")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/get_scraping_logs")
def get_scraping_logs(input_data: DateInput, current_user: dict = Depends(get_current_user)):
    try:
        # Connect to DB
        conn = create_db_connection()
        cursor = conn.cursor()

        input_date = parse_date(input_data.filter_date)

        # Execute the stored procedure with the input date
        cursor.execute("""

select sl.KPI_ID,k.KPI_Name, k.Scheme_Name, sl.National_Status, sl.State_Status, sl.District_Status, sl.State_Status, sl.Status, sl.Log_Date from Scraping_Logs sl INNER JOIN KPI_Master k on sl.KPI_ID = k.KPI_ID 
where Log_Date = ?""", (input_date) )
        
        # Get column names
        columns = [col[0] for col in cursor.description]
        print(columns)
        # Convert rows to list of dicts
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return {"status": 200, "data": results}

    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail="Internal server error occurred.")
    finally:
        cursor.close()
        conn.close()
    

@app.get("/api/ai_insights")
def get_ai_insights():
    # Get the absolute path of the insights.json file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, "AI_Report", "ai_insights.json")

    # Read and return the JSON content
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": 200, "data": data}
    except FileNotFoundError:
        return {"status": 404, "message": "AI report file not found."}
    except json.JSONDecodeError:
        return {"status": 500, "message": "Invalid JSON format in AI report file."}

@app.get("/api/get-scheme-scrap-mapping")
def get_scheme_scrap_mapping():
    try:
        return JSONResponse(content=scrap_mapping, status_code=200)
    except Exception as e:
        return JSONResponse(
            content={"error": "Failed to load scheme KPI data"},
            status_code=500
        )
@app.post("/api/run-scraper")
async def run_scraper(request: Request):
    try:
        data = await request.json()
        filename = data.get("file_name")
        scrap_folder = data.get("folder")

        if not filename:
            raise HTTPException(status_code=400, detail="Missing 'file_name' in request.")

        base_path = Path(__file__).parent.parent.parent  # project_root
        tool_path = base_path / "Data_Sanity_Tool"

        # Virtual environment Python interpreter
        venv_python = tool_path / "venv" / "Scripts" / "python.exe"
        if not venv_python.exists():
            raise Exception(f"Virtual environment Python not found at {venv_python}")

        # Scraper script
        scraper_script = tool_path / scrap_folder / f"{filename}.py"
        if not scraper_script.exists():
            print(scraper_script)
            
            raise HTTPException(status_code=404, detail=f"Scraper script not found.")

        # Run scraper in background (non-blocking)
        subprocess.Popen(
            [str(venv_python), str(scraper_script)],
            cwd=tool_path,
            stdout=subprocess.DEVNULL,  # Optional: suppress console logs
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW  # Optional: no console window
        )

        # Immediate response
        return JSONResponse(
            content={"message": f"Scraper '{filename}' started successfully."},
            status_code=202
        )

    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )
    
@app.post("/api/stream-logs")
async def stream_logs(request: Request): 
    #filename = 'gram_panchayat_approved_national_logger.log'

    data = await request.json()
    filename = data.get("log_file")

    # Construct log file path
    base_path = Path(__file__).parent.parent.parent  # project_root
    tool_path = base_path / "Data_Sanity_Tool"
    LOG_FILE_PATH = tool_path / "logs" / f"{filename}.log"

    print(f"Streaming log file: {LOG_FILE_PATH}")

    # Wait up to 10 seconds for the log file to appear
    wait_time = 0
    while not LOG_FILE_PATH.exists() and wait_time < 9:
        await asyncio.sleep(0.3)
        wait_time += 0.3

    if not LOG_FILE_PATH.exists():
        print(f"Log file not found after waiting: {LOG_FILE_PATH}")
        return JSONResponse(
            {"error": f"Log file not found."},
            status_code=404
        )

    async def log_generator():
        with open(LOG_FILE_PATH, "r") as f:
            f.seek(0, os.SEEK_END)  # Jump to end of file
            while True:
                if await request.is_disconnected():
                    print("Client disconnected")
                    break

                line = f.readline()
                if line:
                    # Send log line
                    #yield f"event: log\ndata: {line.strip()}\n\n"
                    yield f"{line.strip()}\n\n"
                    print("Sent:", line.strip())

                    if "google_apis" in line and "Error" in line:
                        continue
                    # Send "done" event if complete
                    if "DB connection closed" in line or "Database connection closed" in line or "closed" in line:
                        yield f"event: done\ndata: Scraping finished successfully.\n\n"
                        break
                    
                    if "Error" in line or "Exception" in line :
                        yield f"event: done\ndata: Scraping failed.\n\n"
                        break
                else:
                    await asyncio.sleep(0.5)

    return EventSourceResponse(log_generator())

@app.post("/api/download-log")
async def download_log(request: Request):
    data = await request.json()
    filename = data.get("log_file")

    base_path = Path(__file__).parent.parent.parent  # project_root
    tool_path = base_path / "Data_Sanity_Tool"
    
    log_path = tool_path / "logs" / f"{filename}.log"
    print(log_path)
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    return FileResponse(
        path=log_path,
        media_type='text/plain',
        filename=f"{filename}.log"
    )

@app.get("/{full_path:path}")
async def server_spa(full_path: str):
    index_path = os.path.join("dist", "index.html")
    return FileResponse(index_path)