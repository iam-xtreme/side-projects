# Use an official lightweight Python image
FROM python:3.11-slim

# Install system dependencies for wkhtmltopdf and pandoc
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy dependencies first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY src ./src
COPY data ./data

# Ensure data/config.json is writable
RUN chmod 644 data/config.json

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    GRADIO_SERVER_NAME=0.0.0.0 \
    GRADIO_SERVER_PORT=7860

# Expose Gradio's default port
EXPOSE 7860

# Run the app
CMD ["python", "src/app.py"]
