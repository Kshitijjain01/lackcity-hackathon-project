// OpenRouter API utility for medical triage
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

export async function getTriageResult(symptoms) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.')
  }
const systemPrompt = `
You are an AI medical triage assistant for a healthcare routing system.
You must NOT diagnose diseases or conditions.

Your task is to convert symptoms into routing information for hospitals and doctors.

Return ONLY a valid JSON object in this exact format:
{
  "specialist": "",
  "department": "",
  "urgency": "",
  "facility_type": "",
  "search_keywords": [],
  "emergency_required": false
}

Field meaning:
- specialist: doctor type (e.g., Cardiologist, General Physician, Neurologist, Dermatologist)
- department: hospital department name used in searches (e.g., Cardiology, Emergency, Pediatrics)
- urgency:
  - "normal"
  - "urgent"
  - "emergency"
- facility_type:
  - "clinic"
  - "hospital"
  - "emergency_room"
- search_keywords: array of keywords to feed into Google Maps search
  Example: ["cardiology hospital", "heart specialist", "emergency care"]
- emergency_required:
  - true if urgency is "emergency"
  - false otherwise

Rules:
- Do NOT diagnose.
- Do NOT name any diseases.
- Do NOT suggest medicine or treatment.
- Do NOT explain anything.
- Do NOT add extra fields.
- Do NOT write anything outside JSON.
- Make output optimized for Google Maps search queries.
`;


  const userPrompt = `User symptoms: "${symptoms}"`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Lackecity Medical Triage',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter API error response:', data)
      const errorMsg = data.error?.message || `OpenRouter API error: ${response.status}`
      throw new Error(errorMsg)
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Unexpected API response format:', data)
      throw new Error('Unexpected response format from OpenRouter API')
    }

    const content = data.choices[0].message.content.trim()
    
    // Remove markdown code blocks if present
    let jsonString = content
    if (content.startsWith('```')) {
      jsonString = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    }

    // Parse the JSON response
    const result = JSON.parse(jsonString)
    
    return {
      specialist: result.specialist || 'General Practitioner',
      department: result.department || 'General Medicine',
      urgency: result.urgency || 'normal',
      facility_type: result.facility_type || 'hospital',
      search_keywords: result.search_keywords || [],
      emergency_required: result.emergency_required || false,
    }
  } catch (error) {
    console.error('Error calling OpenRouter:', error)
    throw error
  }
}
