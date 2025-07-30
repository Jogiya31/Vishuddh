from app.core.config import settings
from passlib.context import CryptContext    
import jwt
from jwt import PyJWTError
import datetime as dt
import math
import pyodbc
import locale
import pandas as pd
from datetime import datetime
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any, Optional

SERVER = settings.server
DATABASE = settings.database
DRIVER = settings.driver
CONNECTION_STRING = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes"

# Set Indian locale for numeric formatting
locale.setlocale(locale.LC_ALL, 'en_IN')

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(data: dict, expires_delta_minutes=60):
    expire = dt.datetime.utcnow() + dt.timedelta(minutes = expires_delta_minutes)
    data.update({"exp": expire})
    return jwt.encode(data, settings.secret_key, algorithm=settings.algorithm)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def sanitize_data(data):
    """Recursively traverse data and replace non-finite floats or string 'nan' with 'NA'."""
    if isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return "NA"
        return data
    elif isinstance(data, str):
        if data.strip().lower() == "nan":
            return "NA"
        return data
    else:
        return data
    

def create_db_connection():
    """Create a connection to the SQL Server."""
    try:
        conn = pyodbc.connect(CONNECTION_STRING)
        return conn
    except pyodbc.Error as e:
        print(f"Database connection error: {e}")
        return None
    

def format_number(value: float, two_decimal: bool = False) -> str:
    """Format a number using Indian locale grouping without unit labels."""
    if value is None or value == "NA":
        return "NA"
    try:
        value = float(value)
        if two_decimal:
            return locale.format_string("%.2f", value, grouping=True)
        return locale.format_string("%d", int(value), grouping=True)
    except ValueError:
        return "NA"

def number_to_indian_currency_format(num, is_difference: bool = True, two_decimal: bool = False) -> str:
    """
    Convert a numeric value into Indian numbering format with unit labels.
    For values below 1 Lakh (if is_difference is True), local grouping is used.
    """
    if num is None:
        return "NA"
    if isinstance(num, str):
        try:
            num = float(num)
        except ValueError:
            return "NA"
    is_negative = (num < 0)
    num = abs(num)
    if num == 0.0:
        return "0.00" if two_decimal else "0"
    if is_difference and num < 100000:
        if two_decimal:
            formatted_num = locale.format_string("%.2f", num, grouping=True)
        else:
            formatted_num = locale.format_string("%d", int(round(num)), grouping=True)
        return f"-{formatted_num}" if is_negative else formatted_num
    def fmt(val):
        return f"{val:.2f}" if two_decimal else f"{val:.2f}"
    if num >= 10**11:
        formatted_num = f"{fmt(num / 10**11)} Lakh Cr"
    elif num >= 10**9:
        formatted_num = f"{fmt(num / 10**9)} Th Cr"
    elif num >= 10**7:
        formatted_num = f"{fmt(num / 10**7)} Cr"
    elif num >= 10**5:
        formatted_num = f"{fmt(num / 10**5)} L"
    else:
        if two_decimal:
            formatted_num = locale.format_string("%.2f", num, grouping=True)
        else:
            formatted_num = locale.format_string("%d", int(round(num)), grouping=True)
    return f"-{formatted_num}" if is_negative else formatted_num

def format_date_custom(val) -> str:
    """Convert a pd.Timestamp or datetime to dd--mm--yyyy format, or return 'NA' if null."""
    if pd.isnull(val):
        return "NA"
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.strftime("%d-%m-%Y")
    return str(val) if val is not None else "NA"

def matching_data_national(with_units: bool = True) -> Dict[str, Any]:
    """Merge national data from the two national tables and choose the final date based on a comparison."""
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")
    try:
        cursor = conn.cursor()
        
        sql_query_scrapped =f""";with cte as (\
                        SELECT* ,Row_number() over (partition by KPI_id,national_id order by Scrapped_value_date_of_data desc) as Row_num
                        FROM {settings.national_table_name1} \
                        )\
                        Select * from Cte where Row_num = 1"""

        # Fetch scrapped national data
        cursor.execute(sql_query_scrapped)
        scrapped_data = cursor.fetchall()
        scrapped_columns = [col[0] for col in cursor.description]
        scrapped_data = [list(row) for row in scrapped_data]
        scrapped_df = pd.DataFrame(scrapped_data, columns=scrapped_columns).drop_duplicates()
        print("--169",scrapped_df)
        
            # Fetch scheme national data
        sql_query_critical =f" with cte as (\
        SELECT* ,Row_number() over (partition by KPI_id,national_id order by critical_api_scrapped_at desc) as Row_num\
        FROM {settings.national_table_name2} \
        ) \
        Select * from Cte where Row_num = 1"
        cursor.execute(sql_query_critical)
        scheme_data = cursor.fetchall()
        scheme_columns = [col[0] for col in cursor.description]
        scheme_data = [list(row) for row in scheme_data]
        scheme_df = pd.DataFrame(scheme_data, columns=scheme_columns).drop_duplicates()
        print("--182",scheme_df)
        
        # Define grouping columns for national data
        group_cols = ['kpi_id', 'national_id', 'National', 'Scheme', 'KPI']
        
        # For scrapped data, aggregate so that for scrapped_value_date_of_data we take the maximum.
        agg_dict = {
            "critical_api_value": "first",
            "critical_api_scrapped_at": "first",
            "scrapped_value": "first",
            "scrapped_value_date_of_data": "max",
            "MisMatch": "first",
            "Absolute Difference": "first",
            "% Difference": "first",
            "Remarks": "first",
            "Input Type": "first"
        }
        agg_scrapped_df = scrapped_df.groupby(group_cols, as_index=False).agg(agg_dict)
        print("aggregate script",  agg_scrapped_df.columns)
        
        # For scheme data, pick the row with the latest critical_api_scrapped_at in each group.
        def get_group_max(df):
            if df['critical_api_scrapped_at'].isnull().all():
        # If all values are NaN, return the first row.
                return df.iloc[0]
            else:
        # Otherwise, return the row with the maximum value.
                return df.loc[df['critical_api_scrapped_at'].idxmax()]

        # For scheme data, pick the row with the latest critical_api_scrapped_at in each group
        latest_scheme_df = scheme_df.groupby(group_cols).apply(get_group_max).reset_index(drop=True).fillna('na')
        print("latest_scheme_df", latest_scheme_df.head(5))
        
        # Merge on group_cols plus the common critical_api_value and critical_api_scrapped_at
        join_cols = group_cols 
        merged_df = pd.merge(agg_scrapped_df, latest_scheme_df, on=join_cols, suffixes=('_scrapped', '_scheme'),how = 'left').fillna('NA')
        print("merged_df",merged_df.columns)
        
        def get_number(value):
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        special_kpis = ["Disbursed Loan Amount", "Expenditure - FY (2024-25)", "Road Built 2014-23"]
        output_data = {}
        for _, row in merged_df.iterrows():
            scheme = row.get("Scheme")
            kpi = row.get("KPI")
            region = row.get("National")
            if not all([scheme, kpi, region]):
                continue
            two_decimal = kpi in special_kpis

            critical_api_value_raw = get_number(row.get("critical_api_value_scheme"))
            native_value_raw = get_number(row.get("scrapped_value"))
            scheme_value_raw = get_number(row.get("scheme_view_value"))
            native_diff_raw = get_number(row.get("Absolute Difference_scrapped"))
            native_diff_percent_raw = get_number(row.get("% Difference_scrapped"))
            scheme_diff_raw = get_number(row.get("Absolute Difference_scheme"))
            scheme_diff_percent_raw = get_number(row.get("% Difference_scheme"))
            
            if with_units:
                formatted_critical_api_value = number_to_indian_currency_format(critical_api_value_raw, False, two_decimal)
                formatted_native_value = number_to_indian_currency_format(native_value_raw, False, two_decimal)
                formatted_scheme_value = number_to_indian_currency_format(scheme_value_raw, False, two_decimal)
                formatted_native_diff = number_to_indian_currency_format(native_diff_raw, True, two_decimal)
                formatted_scheme_diff = number_to_indian_currency_format(scheme_diff_raw, True, two_decimal)
            else:
                formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
                formatted_native_value = format_number(native_value_raw, two_decimal)
                formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
                formatted_native_diff = format_number(native_diff_raw, two_decimal)
                formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
            
            formatted_native_diff_percent = f"{native_diff_percent_raw:.2f}" if native_diff_percent_raw is not None else "NA"
            formatted_scheme_diff_percent = f"{scheme_diff_percent_raw:.2f}" if scheme_diff_percent_raw is not None else "NA"
            
            # Compute the final date:
            # Retrieve the critical API date and the aggregated scrapped date.
            crit_date = row.get("critical_api_scrapped_at_scrapped")
            scrap_date = row.get("scrapped_value_date_of_data")
            try:
                crit_dt = pd.to_datetime(crit_date)
                scrap_dt = pd.to_datetime(scrap_date)
            except Exception:
                crit_dt = scrap_dt = None
            
            if crit_dt is not None and scrap_dt is not None and crit_dt == scrap_dt:
                final_date = format_date_custom(crit_date)
            else:
                final_date = format_date_custom(scrap_date)
            
            if scheme not in output_data:
                output_data[scheme] = {}
            if kpi not in output_data[scheme]:
                output_data[scheme][kpi] = {}
            output_data[scheme][kpi][region] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at_scrapped")),
                "prayasValue": formatted_critical_api_value,
                "critical_api_value_raw": critical_api_value_raw,
                "nativeDashValue": formatted_native_value,
                "date_of_data": final_date,
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiff_raw": native_diff_raw,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashDiffPercent_raw": native_diff_percent_raw,
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiff_raw": scheme_diff_raw,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashDiffPercent_raw": scheme_diff_percent_raw,
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA",
            }
        return output_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
def format_percentage_with_min(value, min_val=0.01):
    """Round to 2 decimals; if the result is 0 but the raw value is nonzero, return ±min_val."""
    if value is None:
        return "NA"
    r = round(value, 2)
    if r == 0 and value != 0:
        return min_val if value > 0 else -min_val
    return float(r)
# ------------------ State-level merging function ------------------
def matching_data_state(with_units: bool = True) -> Dict[str, Any]:
    """Merge data from the two state tables and choose the final date based on a comparison."""
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")
    try:
        cursor = conn.cursor()
        # cursor.execute(f"SELECT * FROM {state_table_name1}")
        sql_query_scrapped =f""";with cte as (\
SELECT* ,Row_number() over (partition by KPI_id,State_id order by Scrapped_value_date_of_data desc) as Row_num
  FROM {settings.state_table_name1} \
  )\
  Select * from Cte where Row_num = 1"""
 
        cursor.execute(sql_query_scrapped)
        scrapped_data = cursor.fetchall()
        scrapped_columns = [col[0] for col in cursor.description]
        scrapped_data = [list(row) for row in scrapped_data]
        scrapped_df = pd.DataFrame(scrapped_data, columns=scrapped_columns).drop_duplicates()
        print("scrapped_df",scrapped_df)
        
        
        sql_query_critical =f" with cte as (\
SELECT* ,Row_number() over (partition by KPI_id,State_id order by critical_api_scrapped_at desc) as Row_num\
  FROM {settings.state_table_name2} \
  ) \
  Select * from Cte where Row_num = 1"
        cursor.execute(sql_query_critical)
        scheme_data = cursor.fetchall()
        scheme_columns = [col[0] for col in cursor.description]
        scheme_data = [list(row) for row in scheme_data]
        scheme_df = pd.DataFrame(scheme_data, columns=scheme_columns).drop_duplicates()
        print(scheme_df.columns)
        
        group_cols = ['kpi_id', 'state_id']
        # For scrapped data, aggregate so that for scrapped_value_date_of_data we take the maximum
        agg_dict = {
            "critical_api_value": "first",
            "critical_api_scrapped_at": "first",
            "scrapped_value": "first",
            "scrapped_value_date_of_data": "first",
            "MisMatch": "first",
            "Absolute Difference": "first",
            "% Difference": "first",
            "Remarks": "first",
            "Input Type": "first"
        }
        agg_scrapped_df = scrapped_df.groupby(group_cols, as_index=False).agg(agg_dict)

        print("aggregate script",  scheme_df[(scheme_df['kpi_id']==1) & (scheme_df['state_id']==1)])
        
        def get_group_max(df):
            if df['critical_api_scrapped_at'].isnull().all():
        # If all values are NaN, return the first row.
                return df.iloc[0]
            else:
        # Otherwise, return the row with the maximum value.
                return df.loc[df['critical_api_scrapped_at'].idxmax()]

        # For scheme data, pick the row with the latest critical_api_scrapped_at in each group
        latest_scheme_df = scheme_df.groupby(group_cols).apply(get_group_max).reset_index(drop=True).fillna('na')
        print("latest_scheme_df", latest_scheme_df.head(5))

        # print("latest scheme script",  latest_scheme_df)
        # print(scheme_df.loc[scheme_df.groupby(group_cols)['critical_api_scrapped_at'].idxmax()].reset_index(drop=True))
        # print("latest scheme script",  latest_scheme_df)
        
        
        # # Merge on group_cols plus the common critical_api_value and critical_api_scrapped_at
        # join_cols = group_cols 
        # merged_df = pd.merge(agg_scrapped_df, scheme_df, on=join_cols, suffixes=('_scrapped', '_scheme'))
        # latest_scheme_df = scheme_df.loc[scheme_df.groupby(group_cols)['critical_api_scrapped_at'].idxmax()].reset_index(drop=True)
 
# Merge on group_cols plus the common critical_api_value and critical_api_scrapped_at
        join_cols = group_cols
        merged_df = pd.merge(agg_scrapped_df, latest_scheme_df, on=join_cols, suffixes=('_scrapped', '_scheme'))
        merged_df=merged_df.fillna('NA')
        print("merged_df",merged_df.head(5))
        
        
        print("latest scheme script",  merged_df[(merged_df['kpi_id']==1) & (merged_df['state_id']==1)])
        print("scrapped value",merged_df.columns)
        
        
    
        
        
        def get_number(value):
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        special_kpis = ["Disbursed Loan Amount", "Expenditure - FY (2024-25)", "Road Built 2014-23"]
        output_data = {}
        for _, row in merged_df.iterrows():
            scheme = row.get("Scheme")
            kpi = row.get("KPI")
            region = row.get("State")
            if not all([scheme, kpi, region]):
                continue
            two_decimal = kpi in special_kpis

            critical_api_value_raw = get_number(row.get("critical_api_value_scrapped"))
            # print("critical_api_value_raw",critical_api_value_raw)
            native_value_raw = get_number(row.get("scrapped_value"))
            # print('native raw',native_value_raw)

            scheme_value_raw = get_number(row.get("scheme_view_value"))
            native_diff_raw = get_number(row.get("Absolute Difference_scrapped"))
            native_diff_percent_raw = get_number(row.get("% Difference_scrapped"))
            scheme_diff_raw = get_number(row.get("Absolute Difference_scheme"))
            scheme_diff_percent_raw = get_number(row.get("% Difference_scheme"))
            
            if with_units:
                formatted_critical_api_value = number_to_indian_currency_format(critical_api_value_raw, False, two_decimal)
                formatted_native_value = number_to_indian_currency_format(native_value_raw, False, two_decimal)
                formatted_scheme_value = number_to_indian_currency_format(scheme_value_raw, False, two_decimal)
                formatted_native_diff = number_to_indian_currency_format(native_diff_raw, True, two_decimal)
                formatted_scheme_diff = number_to_indian_currency_format(scheme_diff_raw, True, two_decimal)
            else:
                formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
                formatted_native_value = format_number(native_value_raw, two_decimal)
                formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
                formatted_native_diff = format_number(native_diff_raw, two_decimal)
                formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
                
            # print("nativr value",formatted_native_value)
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw) if native_diff_percent_raw is not None else "NA"

            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw) if scheme_diff_percent_raw is not None else "NA"
            
            # Determine final date: if critical_api_scrapped_at equals scrapped_value_date_of_data, use that; else use scrapped_value_date_of_data.
            crit_date = row.get("critical_api_scrapped_at_scrapped")
            scrap_date = row.get("scrapped_value_date_of_data")
            try:
                crit_dt = pd.to_datetime(crit_date)
                scrap_dt = pd.to_datetime(scrap_date)
            except Exception as e:
                crit_dt = None
                scrap_dt = None
            
            if crit_dt is not None and scrap_dt is not None and crit_dt == scrap_dt:
                final_date = format_date_custom(crit_date)
            else:
                final_date = format_date_custom(scrap_date)
            
            if scheme not in output_data:
                output_data[scheme] = {}
            if kpi not in output_data[scheme]:
                output_data[scheme][kpi] = {}
            output_data[scheme][kpi][region] = {
                "prayas_date_of_data": format_date_custom(row.get("critical_api_scrapped_at_scrapped")),
                "prayasValue": formatted_critical_api_value,
                "critical_api_value_raw": critical_api_value_raw,
                "nativeDashValue": formatted_native_value,
                "date_of_data": final_date,
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiff_raw": native_diff_raw,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashDiffPercent_raw": native_diff_percent_raw,
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiff_raw": scheme_diff_raw,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashDiffPercent_raw": scheme_diff_percent_raw,
                "deptExcelValue": "NA",
                "deptExcelDiff": "NA",
                "deptExcelDiffPercent": "NA",
                "deptApiValue": "NA",
                "deptApiDiff": "NA",
                "deptApiDiffPercent": "NA",
            }
           
        output_data = sanitize_data(output_data)
        
        return output_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

def format_date_custom2(val) -> str:
    """Convert a pd.Timestamp, datetime, or string to dd-mm-yyyy format, or return 'NA' if null."""
    if pd.isnull(val):
        return "NA"
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.strftime("%d-%m-%Y")
    try:
        dt = pd.to_datetime(val)
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return str(val)

def format_percentage_with_min(value, min_val=0.01):
    """Round to 2 decimals; if result is 0 but raw value isn’t 0, return ±min_val;
    if value is NaN or None, return 'NA'."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "NA"
    r = round(value, 2)
    if r == 0 and value != 0:
        return float(min_val if value > 0 else -min_val)
    return float(r)
# ------------------ District-level merging function ------------------
def matching_data_district(with_units: bool = True) -> Dict[str, Any]:
    """Merge data from the two district tables and choose the final date based on a comparison."""
    conn = create_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")
    try:
        cursor = conn.cursor()
        sql_query_scrapped =f""";with cte as (\
SELECT* ,Row_number() over (partition by KPI_id,district_id order by Scrapped_value_date_of_data desc) as Row_num
  FROM {settings.district_table_name1} \
  )\
  Select * from Cte where Row_num = 1"""
 
        cursor.execute(sql_query_scrapped)
        # Fetch district scrapped data
        
        scrapped_data = cursor.fetchall()
        scrapped_columns = [col[0] for col in cursor.description]
        scrapped_data = [list(row) for row in scrapped_data]
        scrapped_df = pd.DataFrame(scrapped_data, columns=scrapped_columns).drop_duplicates()
        print("scrapped_df",scrapped_df)
        
        
        # Fetch district scheme data
        sql_query_critical =f" with cte as (\
SELECT* ,Row_number() over (partition by KPI_id,district_id order by critical_api_scrapped_at desc) as Row_num\
  FROM {settings.district_table_name2} \
  ) \
  Select * from Cte where Row_num = 1"
        cursor.execute(sql_query_critical)
        scheme_data = cursor.fetchall()
        scheme_columns = [col[0] for col in cursor.description]
        scheme_data = [list(row) for row in scheme_data]
        scheme_df = pd.DataFrame(scheme_data, columns=scheme_columns).drop_duplicates()
        print("scheme_df",scheme_df.head(5))
        
        
        # Define group key columns for district level
        group_cols = ['kpi_id', 'district_id']
        
        # Aggregate scrapped district data:
        # - For most columns, take the first value.
        # - For scrapped_value_date_of_data, take the maximum (latest) date.
        agg_dict = {
            "critical_api_value": "first",
            "critical_api_scrapped_at": "max",
            "scrapped_value": "first",
            "scrapped_value_date_of_data": "max",
            "MisMatch": "first",
            "Absolute Difference": "first",
            "% Difference": "first",
            "Remarks": "first",
            "Input Type": "first"
        }
        agg_scrapped_df = scrapped_df.groupby(group_cols, as_index=False).agg(agg_dict)
        print("agg_scrapped_df",agg_scrapped_df.head(5))
        
        # For scheme district data, select the row with the maximum critical_api_scrapped_at per group.
        def get_group_max(df):
            if df['critical_api_scrapped_at'].isnull().all():
                return df.iloc[0]
            else:
                return df.loc[df['critical_api_scrapped_at'].idxmax()]

        latest_scheme_df = (
            scheme_df.groupby(group_cols)
            .apply(get_group_max)
            .reset_index(drop=True)
            .fillna("na")
        )
        print("latest_scheme_df", latest_scheme_df.head(5))

        # latest_scheme_df = scheme_df.loc[scheme_df.groupby(group_cols)['critical_api_scrapped_at'].idxmax()].reset_index(drop=True).fillna('NA')
        # print("latest_scheme_df",latest_scheme_df.columns)
        
        # Merge the two DataFrames on the common columns
        agg_scrapped_df['critical_api_scrapped_at'] = pd.to_datetime(agg_scrapped_df['critical_api_scrapped_at'], errors='coerce')
        latest_scheme_df['critical_api_scrapped_at'] = pd.to_datetime(latest_scheme_df['critical_api_scrapped_at'], errors='coerce')
        join_cols = group_cols + [ 'critical_api_scrapped_at']
        merged_df = pd.merge(agg_scrapped_df, latest_scheme_df, on=join_cols, suffixes=('_scrapped', '_scheme'))
        print("merged_df",merged_df.columns)
        # print(merged_df['critical_api_scrapped_at'])
       
        def get_number(value):
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        special_kpis = ["Disbursed Loan Amount", "Expenditure - FY (2024-25)", "Road Built 2014-23"]
        output_data = {}
        for _, row in merged_df.iterrows():
            scheme = row.get("Scheme")
            kpi = row.get("KPI")
            state_name = row.get("state_name")
            district_name = row.get("District")
            if not all([scheme, kpi, state_name, district_name]):
                continue
            two_decimal = kpi in special_kpis

            critical_api_value_raw = get_number(row.get("critical_api_value_scrapped"))
            
            native_value_raw = get_number(row.get("scrapped_value"))
            scheme_value_raw = get_number(row.get("scheme_view_value"))
            native_diff_raw = get_number(row.get("Absolute Difference_scrapped"))
            native_diff_percent_raw = get_number(row.get("% Difference_scrapped"))
            scheme_diff_raw = get_number(row.get("Absolute Difference_scheme"))
            scheme_diff_percent_raw = get_number(row.get("% Difference_scheme"))
            
            if with_units:
                formatted_critical_api_value = number_to_indian_currency_format(critical_api_value_raw, False, two_decimal)
                formatted_native_value = number_to_indian_currency_format(native_value_raw, False, two_decimal)
                formatted_scheme_value = number_to_indian_currency_format(scheme_value_raw, False, two_decimal)
                formatted_native_diff = number_to_indian_currency_format(native_diff_raw, True, two_decimal)
                formatted_scheme_diff = number_to_indian_currency_format(scheme_diff_raw, True, two_decimal)
            else:
                formatted_critical_api_value = format_number(critical_api_value_raw, two_decimal)
                formatted_native_value = format_number(native_value_raw, two_decimal)
                formatted_scheme_value = format_number(scheme_value_raw, two_decimal)
                formatted_native_diff = format_number(native_diff_raw, two_decimal)
                formatted_scheme_diff = format_number(scheme_diff_raw, two_decimal)
            
            formatted_native_diff_percent = format_percentage_with_min(native_diff_percent_raw)
            formatted_scheme_diff_percent = format_percentage_with_min(scheme_diff_percent_raw)

            
            # Compute the final date:
            # Get the critical API date and the aggregated scrapped date.
            crit_date = row.get("critical_api_scrapped_at_scrapped")
            scrap_date = row.get("scrapped_value_date_of_data")
            try:
                crit_dt = pd.to_datetime(crit_date)
                scrap_dt = pd.to_datetime(scrap_date)
            except Exception:
                crit_dt = scrap_dt = None
            if crit_dt is not None and scrap_dt is not None and crit_dt == scrap_dt:
                final_date = format_date_custom2(crit_date)
            else:
                final_date = format_date_custom2(scrap_date)
            
            formatted_scheme_date2 = format_date_custom(row.get("critical_api_scrapped_at"))
            # print("DEBUG: scheme_view_date_of_data =", formatted_scheme_date2)

            # Build nested output: Scheme -> KPI -> state_name -> District
            if scheme not in output_data:
                output_data[scheme] = {}
            if kpi not in output_data[scheme]:
                output_data[scheme][kpi] = {}
            if state_name not in output_data[scheme][kpi]:
                output_data[scheme][kpi][state_name] = {}
            output_data[scheme][kpi][state_name][district_name] = {
                "prayas_date_of_data": formatted_scheme_date2,
                "prayasValue": formatted_critical_api_value,
                "critical_api_value_raw": critical_api_value_raw,
                "nativeDashValue": formatted_native_value,
                "date_of_data": final_date,
                "nativeDashDiff": formatted_native_diff,
                "nativeDashDiff_raw": native_diff_raw,
                "nativeDashDiffPercent": formatted_native_diff_percent,
                "nativeDashDiffPercent_raw": native_diff_percent_raw,
                "schemeDashValue": formatted_scheme_value,
                "scheme_date_of_data": format_date_custom(row.get("scheme_view_date_of_data")),
                
                "schemeDashDiff": formatted_scheme_diff,
                "schemeDashDiff_raw": scheme_diff_raw,
                "schemeDashDiffPercent": formatted_scheme_diff_percent,
                "schemeDashDiffPercent_raw": scheme_diff_percent_raw,
                #"deptExcelValue": "NA",
                #"deptExcelDiff": "NA",
                #"deptExcelDiffPercent": "NA",
                #"deptApiValue": "NA",
                #"deptApiDiff": "NA",
                #"deptApiDiffPercent": "NA",
            }
            
        output_data = sanitize_data(output_data)
        return output_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email}
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    

def format_date_custom(val):
    if pd.isnull(val) or val is None:
        return "NA"
    try:
        return pd.to_datetime(val).strftime("%d-%m-%Y")
    except Exception:
        return str(val)

def parse_date(date_str: str) -> str:
    try:
        return datetime.strptime(date_str, "%d-%m-%Y").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd-mm-yyyy")

