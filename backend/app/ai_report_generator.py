import requests, json, time

try:
    response = requests.post("http://10.246.69.235:8080/generate-insights")
    response.raise_for_status()
    with open("ai_insights.json", "w") as f:
        json.dump(response.json(), f)
except Exception as e:
    print(str(e))
    with open("error.log", "a") as log:
        log.write(f"{time.ctime()}: Failed - {str(e)}\n")

        

