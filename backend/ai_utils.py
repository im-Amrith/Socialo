import os
from groq import Groq

CATEGORIES = ["PLUMBING", "ELECTRICAL", "ELEVATOR", "SECURITY", "CLEANING", "GARDENING", "OTHER"]
PRIORITIES = ["HIGH", "MEDIUM", "LOW"]

def triage_complaint(title: str, description: str):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        # We use a fast Groq text model for the triage
        prompt = f"""
Analyze the following complaint and categorize it into exactly one of these categories: {', '.join(CATEGORIES)}
Also assign a priority from: {', '.join(PRIORITIES)}

Complaint Title: {title}
Complaint Description: {description}

Format your response exactly as: CATEGORY|PRIORITY (e.g., PLUMBING|HIGH)
"""
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=20,
        )
        
        response = completion.choices[0].message.content.strip().upper()
        parts = response.split("|")
        
        category = "OTHER"
        priority = "MEDIUM"
        confidence = 0.8
        
        if len(parts) >= 2:
            if parts[0].strip() in CATEGORIES:
                category = parts[0].strip()
            if parts[1].strip() in PRIORITIES:
                priority = parts[1].strip()
                
        return {
            "category": category,
            "priority": priority,
            "confidence": confidence
        }
    except Exception as e:
        print(f"Error triaging complaint with Groq: {e}")
        return {"category": "OTHER", "priority": "MEDIUM", "confidence": 0.0}

def verify_image_relevance(image_url: str, text: str):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Does this image clearly match the following description: '{text}'? Answer with exactly 'YES' or 'NO' followed by a pipe '|' and a confidence score between 0.0 and 1.0. Example: 'YES|0.85'."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ],
            temperature=0,
            max_tokens=20,
        )
        
        response = completion.choices[0].message.content.strip()
        parts = response.split("|")
        
        is_relevant = False
        score = 0.0
        
        if len(parts) >= 2:
            is_relevant = parts[0].strip().upper() == "YES"
            try:
                score = float(parts[1].strip())
            except ValueError:
                score = 0.8 if is_relevant else 0.2
        elif "YES" in response.upper():
            is_relevant = True
            score = 0.8
            
        return {
            "score": score,
            "is_relevant": is_relevant
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error verifying image with Groq: {e}")
        return {"score": 0.0, "is_relevant": False}
