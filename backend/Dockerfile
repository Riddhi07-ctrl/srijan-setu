FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install CPU-only PyTorch
RUN pip install --no-cache-dir torch==2.2.2 torchvision==0.17.2 --extra-index-url https://download.pytorch.org/whl/cpu

# Install ALL backend dependencies
RUN pip install --no-cache-dir fastapi==0.111.0 uvicorn==0.30.1 python-multipart==0.0.9 Pillow==10.3.0 numpy==1.26.4 scikit-learn==1.4.2 xgboost==2.0.3 joblib==1.4.2 psycopg2-binary==2.9.9 pandas==2.2.2 shap==0.45.1 opencv-python-headless==4.9.0.80

COPY . .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
