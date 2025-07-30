from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    server: str
    database: str
    driver: str
    national_table_name1: str
    national_table_name2: str
    state_table_name1: str
    state_table_name2: str
    district_table_name1: str
    district_table_name2: str
    secret_key: str
    algorithm: str

    class Config:
        env_file = ".env"

settings = Settings()