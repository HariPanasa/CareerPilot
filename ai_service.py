import os
import json
from google import genai
from google.genai import types

class AIService:
    def __init__(self):
        # We assume the genai client automatically picks up GEMINI_API_KEY from environment
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found in environment.")
        self.client = genai.Client(api_key=api_key)
        self.model_id = 'gemini-2.5-flash'

    def analyze_resume(self, resume_text, job_description=""):
        """Analyzes the resume text and returns structured JSON."""
        jd_context = f"\n\nTarget Job Description:\n{job_description}\n" if job_description else ""
        
        prompt = f"""
        You are an expert AI Career Counselor and Technical Recruiter. Analyze the following resume text.
        If a Target Job Description is provided, evaluate the resume specifically against that job description.
        Output ONLY valid JSON matching this structure exactly, with no additional markdown or code formatting around it:
        {{
            "ats_score": 0-100,
            "career_domains": ["domain1", "domain2"],
            "skill_gaps": ["missing skill 1", "missing skill 2"],
            "role_recommendations": ["role 1", "role 2"],
            "learning_roadmap": ["step 1", "step 2"],
            "summary": "Brief summary of the candidate's profile and match",
            "resume_improvements": {{
                "better_wording": ["suggestion 1", "suggestion 2"],
                "missing_sections": ["section 1", "section 2"],
                "ats_tips": ["tip 1", "tip 2"],
                "action_verbs": ["verb 1", "verb 2"]
            }},
            "project_ideas": [
                {{
                    "name": "Project Name",
                    "description": "Brief description of the project to address skill gaps.",
                    "tech_stack": ["tech 1", "tech 2"]
                }}
            ]
        }}

        Resume Text:
        {resume_text}{jd_context}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            
            # The response text should be JSON
            return json.loads(response.text)
        except Exception as e:
            print(f"Error analyzing resume with Gemini: {e}")
            return None

    def chat_with_context(self, chat_history, resume_text):
        """Allows follow-up questions using the resume as context."""
        
        system_instruction = f"""
        You are CareerPilot, an expert AI career advisor. Use the following resume text as the context for your advice.
        If the user asks something unrelated to their career or resume, gently guide them back.
        
        User's Resume Text:
        {resume_text}
        """
        
        contents = []
        for msg in chat_history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(msg["text"])]
                )
            )
            
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                )
            )
            return response.text
        except Exception as e:
            print(f"Error during chat: {e}")
            return "I'm sorry, I encountered an error while processing your request."
