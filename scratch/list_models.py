import os, sys, json
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"), override=True)
from google import genai

key = os.getenv("GEMINI_API_KEY", "").strip("'\"")
client = genai.Client(api_key=key)

try:
    models = list(client.models.list())
    model_names = [m.name for m in models]
    with open(os.path.join(_PROJECT_ROOT, "scratch", "available_models.json"), "w", encoding="utf-8") as f:
        json.dump(model_names, f, indent=2)
    print("Found models:", len(model_names))
except Exception as e:
    print("Error listing models:", e)
