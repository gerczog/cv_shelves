from huggingface_hub import HfApi
from dotenv import load_dotenv
import os
from huggingface_hub import snapshot_download

load_dotenv()


snapshot_download(
    repo_id="gerczog/cv_shelves_detect",
    repo_type="model",
    local_dir="app/data/ml_models",  # куда сохранить
    token=os.getenv("HF_TOKEN")
)