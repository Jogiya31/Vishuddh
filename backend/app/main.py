from fastapi import FastAPI, Response, Depends, HTTPException
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import pyodbc
import pandas as pd
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, EmailStr
from io import BytesIO
from decimal import Decimal
import datetime
import openpyxl

# Additional imports for password hashing & JWT
#from passlib.context import CryptContext    
import jwt  
import os
from app.core.config import settings


from app.utils.helpers import format_date_custom, parse_date, verify_password, create_jwt_token, sanitize_data, create_db_connection, format_number, number_to_indian_currency_format, format_date_custom, matching_data_national, format_percentage_with_min, matching_data_state, format_date_custom2, format_percentage_with_min, matching_data_district, get_current_user


app = FastAPI()


app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")  #This assumes dist/assets is relative to where the script is run from
#app.mount("/app", StaticFiles(directory="dist/assets"), name="assets")



origins = [
    "http://127.0.0.1:8080",
    "http://localhost:8080"
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
        print(f"❌ Error fetching Scheme-Department mapping: {e}")
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
        print(f"❌ Error fetching Scheme-Ministry mapping: {e}")
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
        print(f"❌ Error fetching KPI details: {e}")
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
        cursor.execute("SELECT Scheme_Name, KPI_Name, Frequency FROM KPI_Master")
        for scheme, kpi, frequency in cursor.fetchall():
            if scheme not in mapping:
                mapping[scheme] = []
            mapping[scheme].append({
                "KPI Name": kpi,
                "Frequency": frequency,
                "National_URL": "",
                "State_URL": "",
                "District_URL": ""
            })
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
        print(f"❌ Error fetching Scheme-KPI-URL mapping: {e}")
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
        print(f"❌ Error fetching KPI details: {e}")
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
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]
    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)

        if df.empty:
            return JSONResponse(content={
                "stateReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state = row.get("state_name")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            # Parse and format values
            def try_float(val):
                try:
                    return float(val)
                except:
                    return None

            critical_val = try_float(row.get("critical_api_value"))
            native_val = try_float(row.get("scrapped_value"))
            scheme_val = try_float(row.get("scheme_view_value"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": format_date_custom(row.get("scrapped_value_date_of_data")),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": format_date_custom(row.get("compare_date")),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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
def fetch_nested_state_data(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]

        df = pd.DataFrame.from_records(records, columns=columns)

        if df.empty:
            return JSONResponse(content={
                "nationalReportData": {},
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
            national = row.get("national_name")
            if not all([scheme, kpi, national]):
                continue
            def try_float(val):
                try:
                        return float(val)
                except:
                        return None

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("critical_api_value"))
            native_value_raw =try_float(row.get("scrapped_value"))
            scheme_value_raw =try_float(row.get("scheme_view_value"))
            native_diff_raw =try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            native_diff_percent_raw =try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_raw =try_float(row.get("Scheme_crtical_Absolute_Difference"))
            scheme_diff_percent_raw =try_float(row.get("% Scheme_crtical_Difference"))

            formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
            formatted_native_value = format_number(native_value_raw, two_decimal)
            formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
            formatted_native_diff = format_number(native_diff_raw, two_decimal)
            formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at"),
                "prayasValue": formatted_critical_api_value,
                "nativeDashValue": formatted_native_value,
                "date_of_data": row.get("scrapped_value_date_of_data"),
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks"),
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": row.get("scheme_view_date_of_data"),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks"),
                "compare_date": row.get("compare_date")
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
        


@app.post("/api/district-historical-nested")
def fetch_nested_state_data(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
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

    def format_percentage_with_min(value, min_val=0.01):
        if value is None:
            return "NA"
        r = round(value, 2)
        if r == 0 and value != 0:
            return min_val if value > 0 else -min_val
        return float(r)

    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

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

            formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
            formatted_native_value = format_number(native_value_raw, two_decimal)
            formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
            formatted_native_diff = format_number(native_diff_raw, two_decimal)
            formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
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
                "compare_date": row.get("compare_date"),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_report_view_national @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]

        df = pd.DataFrame.from_records(records, columns=columns)

        if df.empty:
            return JSONResponse(content={
                "nationalReportData": {},
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
            national = row.get("national_name")
            if not all([scheme, kpi, national]):
                continue

            def try_float(val):
                try:
                    return float(val)
                except:
                    return None

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("critical_api_value"))
            native_value_raw = try_float(row.get("scrapped_value"))
            scheme_value_raw = try_float(row.get("scheme_view_value"))
            native_diff_raw = try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            native_diff_percent_raw = try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_raw = try_float(row.get("Scheme_crtical_Absolute_Difference"))
            scheme_diff_percent_raw = try_float(row.get("% Scheme_crtical_Difference"))

            formatted_critical_api_value = number_to_indian_currency_format(critical_api_value_raw, False, two_decimal)
            formatted_native_value = number_to_indian_currency_format(native_value_raw, False, two_decimal)
            formatted_scheme_value = number_to_indian_currency_format(scheme_value_raw, False, two_decimal)
            formatted_native_diff = number_to_indian_currency_format(native_diff_raw, True, two_decimal)
            formatted_scheme_diff = number_to_indian_currency_format(scheme_diff_raw, True, two_decimal)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at"),
                "prayasValue": formatted_critical_api_value,
                "nativeDashValue": formatted_native_value,
                "date_of_data": row.get("scrapped_value_date_of_data"),
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks"),
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": row.get("scheme_view_date_of_data"),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks"),
                "compare_date": row.get("compare_date")
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
@app.post("/api/state-historical-nested-unit")
def fetch_nested_state_data_indian(input_data: DateInput, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]
    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_report_view @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)

        if df.empty:
            return JSONResponse(content={
                "stateReportData": {},
                "kpiDetails": get_kpi_details(),
                "mappingData": get_scheme_kpi_mapping(),
                "date": input_data.filter_date
            })

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state = row.get("state_name")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            def try_float(val):
                try:
                    return float(val)
                except:
                    return None

            critical_val = try_float(row.get("critical_api_value"))
            native_val = try_float(row.get("scrapped_value"))
            scheme_val = try_float(row.get("scheme_view_value"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at")),
                "prayasValue": number_to_indian_currency_format(critical_val, False, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": number_to_indian_currency_format(native_val, False, two_decimal),
                "date_of_data": format_date_custom(row.get("scrapped_value_date_of_data")),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_val, True, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": number_to_indian_currency_format(scheme_val, False, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_val, True, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": format_date_custom(row.get("compare_date")),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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
                "compare_date": row.get("compare_date"),
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
        df = pd.DataFrame.from_records(records, columns=columns)
        print("LATEST COLUMNS:", df.columns.tolist())

        
        

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        output_data = {}

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state = row.get("State_Name")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = try_float(row.get("Critical_API_Value"))
            native_val = try_float(row.get("Scrapped_Value"))
            scheme_val = try_float(row.get("Prayas_Value"))
            native_diff_val = try_float(row.get("Scrapped_Critical_Absolute_Diff"))
        
            scheme_diff_val = try_float(row.get("Prayas_Critical_Absolute_Diff"))
            native_diff_pct = try_float(row.get("%_Scrapped_Critical_Diff"))
            scheme_diff_pct = try_float(row.get("%_Prayas_Critical_Diff"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": format_date_custom(row.get("Compare_Date")),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date")),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": format_date_custom(row.get("compare_date")),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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

        df = pd.DataFrame.from_records(records, columns=columns)

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['scrapped_value_date_of_data', 'critical_api_scrapped_at', 'scheme_view_date_of_data', 'compare_date']:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            national = row.get("National_Name")
            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("Critical_API_Value"))
            native_value_raw = try_float(row.get("Scrapped_Value"))
            scheme_value_raw = try_float(row.get("Prayas_Value"))
            native_diff_raw = try_float(row.get("Scrapped_Critical_Absolute_Diff"))  #ojas changes
            native_diff_percent_raw = try_float(row.get("%_Scrapped_Critical_Diff"))
            scheme_diff_raw = try_float(row.get("Prayas_Critical_Absolute_Diff"))
            scheme_diff_percent_raw = try_float(row.get("%_Prayas_Critical_Diff")) #ojas changes

            formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
            formatted_native_value = format_number(native_value_raw, two_decimal)
            formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
            formatted_native_diff = format_number(native_diff_raw, two_decimal)
            formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date")),
                "prayasValue": formatted_critical_api_value,
                "nativeDashValue": formatted_native_value,
                "date_of_data": format_date_custom(row.get("Compare_Date")),
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date")),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": row.get("compare_date")
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

@app.post("/national-detailed-nested-toggle-unit")
def fetch_nested_national_data_toggle(input_data: DateInput3) -> Dict[str, Any]:
    
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]

    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_latest_national_level_comparison")
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['scrapped_value_date_of_data', 'critical_api_scrapped_at', 'scheme_view_date_of_data', 'compare_date']:
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)

        def try_float(val):
            try:
                return float(val)
            except:
                return None

        output_data = {}
        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            national = row.get("National_Name")
            if not all([scheme, kpi, national]):
                continue

            two_decimal = kpi in special_kpis

            critical_api_value_raw = try_float(row.get("Critical_API_Value"))
            native_value_raw = try_float(row.get("Scrapped_Value"))
            scheme_value_raw = try_float(row.get("Prayas_Value"))
            native_diff_raw = try_float(row.get("Scrapped_Critical_Absolute_Diff"))
            native_diff_percent_raw = try_float(row.get("%_Scrapped_Critical_Diff"))
            scheme_diff_raw = try_float(row.get("Prayas_Critical_Absolute_Diff"))
            scheme_diff_percent_raw = try_float(row.get("%_Prayas_Critical_Diff"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[national] = {
                "prayas_date_of_data": format_date_custom(row.get("Compare_Date")),
                "prayasValue": number_to_indian_currency_format(critical_api_value_raw, False, two_decimal),
                "nativeDashValue": number_to_indian_currency_format(native_value_raw, False, two_decimal),
                "date_of_data": format_date_custom(row.get("Compare_Date")),
                "nativeDashDiff": number_to_indian_currency_format(native_diff_raw, True, two_decimal),
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_percent_raw),
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": number_to_indian_currency_format(scheme_value_raw, False, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("Compare_Date")),
                "schemeDashDiff": number_to_indian_currency_format(scheme_diff_raw, True, two_decimal),
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_percent_raw),
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": row.get("compare_date")
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
        df = pd.DataFrame.from_records(records, columns=columns)
        print("--1872", df.columns.tolist())

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        for date_col in ['Compare_Date']:  # only this exists
            if date_col in df.columns:
                df[date_col] = df[date_col].apply(format_date_custom)


        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state_name = row.get("State_Name")
            district_name = row.get("District_Name")

            if not all([scheme, kpi, state_name, district_name]):
                continue

            two_decimal = kpi in special_kpis

            critical_val = get_number(row.get("Critical_API_Value"))
            native_val = get_number(row.get("Scrapped_Value"))
            scheme_val = get_number(row.get("Prayas_Value"))
            #native_diff_val = get_number(row.get("Scrapped_Crtical_Absolute_Diff"))
            #scheme_diff_val = get_number(row.get("Prayas_Crtical_Absolute_Diff"))
            #native_diff_pct = get_number(row.get("% Scrapped_Crtical_Difference"))
            #scheme_diff_pct = get_number(row.get("% Prayas_Crtical_Difference"))

            native_diff_val = get_number(row.get("Scrapped_Critical_Absolute_Diff"))
            scheme_diff_val = get_number(row.get("Prayas_Critical_Absolute_Diff"))
            native_diff_pct = get_number(row.get("%_Scrapped_Critical_Diff"))  # exact match
            scheme_diff_pct = get_number(row.get("%_Prayas_Critical_Diff"))    # exact match

            

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("Compare_Date"),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": row.get("Compare_Date"),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": row.get("Compare_Date"),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": row.get("compare_date"),
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
        cursor.execute("EXEC sp_historical_latest_report_view @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)

        # Only proceed to generate nested data if toggle is True and data is present
        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            state = row.get("state_name")
            if not all([scheme, kpi, state]):
                continue

            two_decimal = kpi in special_kpis

            def try_float(val):
                try:
                    return float(val)
                except:
                    return None

            critical_val = try_float(row.get("critical_api_value"))
            native_val = try_float(row.get("scrapped_value"))
            scheme_val = try_float(row.get("scheme_view_value"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {})[state] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": format_date_custom(row.get("scrapped_value_date_of_data")),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": format_date_custom(row.get("compare_date")),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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
    special_kpis = ["Disbursed Loan Amount", "Expenditure", "Road Built 2014-23"]
    filter_date_sql = parse_date(input_data.filter_date)
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    try:
        cursor = conn.cursor()
        cursor.execute("EXEC sp_historical_latest_report_view_national @Filterdate = ?", filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)

        # Only proceed to generate nested data if toggle is True and data is present
        if not input_data.toggle or df.empty:
            return Response(status_code=204)

        output_data = {}

        for _, row in df.iterrows():
            scheme = row.get("Scheme_Name")
            kpi = row.get("KPI_Name")
            if not all([scheme, kpi]):
                continue

            two_decimal = kpi in special_kpis

            def try_float(val):
                try:
                    return float(val)
                except:
                    return None

            critical_val = try_float(row.get("critical_value"))
            native_val = try_float(row.get("scrapped_value"))
            scheme_val = try_float(row.get("scheme_value"))
            native_diff_val = try_float(row.get("Scrapped_crtical_Absolute_Difference"))
            scheme_diff_val = try_float(row.get("Scheme_crtical_Absolute_Difference"))
            native_diff_pct = try_float(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_pct = try_float(row.get("% Scheme_crtical_Difference"))

            # For National Level, use "National" as the key
            output_data.setdefault(scheme, {}).setdefault(kpi, {})["India"] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_scrapped_at")),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": format_date_custom(row.get("scrapped_value_date")),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": format_date_custom(row.get("scheme_scrapped_at")),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": format_date_custom(row.get("compare_date")),
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
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
@app.post("/api/district-historical-nested-toggle")
def fetch_nested_district_data_toggle(input_data: DateInput2, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
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
    filter_date_sql = parse_date(input_data.filter_date)
    try:
        cursor = conn.cursor()
        # filter_date_sql="14-04-2025"
        cursor.execute("EXEC sp_historical_latest_district_report_view @Filterdate = ?",filter_date_sql)
        records = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        df = pd.DataFrame.from_records(records, columns=columns)
        print("--2157", df.columns.tolist())
        # df.to_csv("test2.csv", index=False)

        if not input_data.toggle or df.empty:
            return Response(status_code=204)

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

            critical_val = get_number(row.get("critical_api_value"))
            native_val = get_number(row.get("scrapped_value"))
            scheme_val = get_number(row.get("scheme_view_value"))
            native_diff_val = get_number(row.get("Scrapped_crtical_Absolute_Difference"))
            scheme_diff_val = get_number(row.get("Scheme_crtical_Absolute_Difference"))
            native_diff_pct = get_number(row.get("% Scrapped_crtical_Difference"))
            scheme_diff_pct = get_number(row.get("% Scheme_crtical_Difference"))

            output_data.setdefault(scheme, {}).setdefault(kpi, {}).setdefault(state_name, {})

            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": row.get("critical_api_scrapped_at"),
                "prayasValue": format_number(critical_val, two_decimal),
                "critical_api_value_raw": critical_val,
                "nativeDashValue": format_number(native_val, two_decimal),
                "date_of_data": row.get("scrapped_value_date_of_data"),
                "nativeDashDiff": format_number(native_diff_val, two_decimal),
                "nativeDashDiff_raw": native_diff_val,
                "nativeDashDiffPercent": format_percentage_with_min(native_diff_pct),
                "nativeDashDiffPercent_raw": native_diff_pct,
                "nativeDashRemark": row.get("Scrapped_crtical_Remarks") or "NA",
                "schemeDashValue": format_number(scheme_val, two_decimal),
                "scheme_date_of_data": row.get("scheme_view_date_of_data"),
                "schemeDashDiff": format_number(scheme_diff_val, two_decimal),
                "schemeDashDiff_raw": scheme_diff_val,
                "schemeDashDiffPercent": format_percentage_with_min(scheme_diff_pct),
                "schemeDashDiffPercent_raw": scheme_diff_pct,
                "schemeDashRemark": row.get("Scheme_crtical_Remarks") or "NA",
                "compare_date": row.get("compare_date"),
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
            "mappingData": get_scheme_kpi_mapping()
        }))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/{full_path:path}")
async def server_spa(full_path: str):
    index_path = os.path.join("dist", "index.html")
    return FileResponse(index_path)