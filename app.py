import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile

from services.resume_parser import parse_resume
from services.ai_service import AIService

# Load environment variables (override allows picking up changes without full restart)
load_dotenv(override=True)

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    return jsonify({
        "error": f"Unhandled Exception: {str(e)}",
        "traceback": traceback.format_exc()
    }), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
    
    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        fd, temp_path = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)
        
        try:
            job_description = request.form.get('job_description', '')
            file.save(temp_path)
            
            resume_text = parse_resume(temp_path)
            if not resume_text:
                return jsonify({"error": "Failed to extract text from the PDF"}), 400
                
            try:
                ai_service = AIService()
                analysis_result = ai_service.analyze_resume(resume_text, job_description)
            except Exception as e:
                return jsonify({"error": f"AI Service Error: {str(e)}. Please check your .env file and API key."}), 500
            
            if not analysis_result:
                return jsonify({"error": "Failed to analyze resume with AI. Check API key."}), 500
                
            return jsonify({
                "success": True,
                "resume_text": resume_text,
                "analysis": analysis_result
            })
            
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        return jsonify({"error": "Only PDF files are supported"}), 400

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request"}), 400
        
    chat_history = data.get('history', [])
    resume_text = data.get('resume_text', '')
    
    if not chat_history:
        return jsonify({"error": "No chat history provided"}), 400
        
    try:
        ai_service = AIService()
        reply = ai_service.chat_with_context(chat_history, resume_text)
    except Exception as e:
        return jsonify({"error": f"AI Service Error: {str(e)}. Please check your .env file and API key."}), 500
    
    return jsonify({"reply": reply})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
