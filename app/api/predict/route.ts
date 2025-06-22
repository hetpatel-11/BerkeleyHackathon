import { NextRequest, NextResponse } from 'next/server'

const LSTM_API_BASE = 'https://my-lstm-api-537563823214.us-central1.run.app'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subsystem, sequence } = body

    console.log(`🔍 API Route: Received request for ${subsystem} with ${Array.isArray(sequence) ? sequence.length : 'invalid'} ${subsystem === 'engine' ? 'features' : 'timesteps'}`)

    if (!subsystem || !sequence) {
      return NextResponse.json(
        { error: 'Missing subsystem or sequence' },
        { status: 400 }
      )
    }

    // Validate sequence length based on subsystem type
    if (subsystem === 'engine') {
      // Engine expects 24 features
      if (!Array.isArray(sequence) || sequence.length !== 24) {
        console.error(`❌ Engine prediction requires exactly 24 features, got ${sequence.length}`)
        return NextResponse.json(
          { error: `Engine prediction requires exactly 24 features, got ${sequence.length}` },
          { status: 400 }
        )
      }
    } else {
      // Subsystems expect 50 timesteps
      if (!Array.isArray(sequence) || sequence.length !== 50) {
        console.error(`❌ ${subsystem} prediction requires exactly 50 timesteps, got ${sequence.length}`)
        return NextResponse.json(
          { error: `Sequence length must be 50` },
          { status: 400 }
        )
      }
    }

    // All APIs expect { sequence: ... } format
    const requestBody = { sequence }

    console.log(`🌐 API Route: Making request to ${LSTM_API_BASE}/predict/${subsystem}`)

    // Make request to LSTM API
    const response = await fetch(`${LSTM_API_BASE}/predict/${subsystem}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ LSTM API Error: ${response.status} ${response.statusText} - ${errorText}`)
      throw new Error(`API responded with ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ API Route: Successful response for ${subsystem}:`, data)

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Prediction API error:', error)
    return NextResponse.json(
      { error: 'Failed to get prediction' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  }
} 