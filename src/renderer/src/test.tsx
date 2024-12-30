import { useEffect } from 'react'

const Test = () => {
  async function checkTurnServer({ urls, username, credential, timeoutSeconds = 5 }) {
    return new Promise((resolve) => {
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: urls,
            username: username,
            credential: credential
          }
        ]
      })

      // Set timeout
      const timeout = setTimeout(() => {
        cleanup()
        resolve({
          success: false,
          error: 'Timeout checking TURN server'
        })
      }, timeoutSeconds * 1000)

      // Cleanup function
      const cleanup = () => {
        clearTimeout(timeout)
        pc.close()
      }

      // Handle ICE candidate events
      pc.onicecandidate = (e) => {
        if (!e.candidate) return

        // Check if we got a relay candidate
        if (e.candidate.type === 'relay') {
          cleanup()
          resolve({
            success: true,
            candidate: e.candidate
          })
        }
      }

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          cleanup()
          resolve({
            success: false,
            error: 'ICE connection failed'
          })
        }
      }

      // Handle errors
      pc.onicecandidateerror = (e) => {
        console.warn('ICE candidate error:', e)
      }

      // Create data channel to trigger ICE candidate gathering
      pc.createDataChannel('test')

      // Create offer to start ICE gathering
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => {
          cleanup()
          resolve({
            success: false,
            error: `Error creating offer: ${err.message}`
          })
        })
    })
  }

  useEffect(() => {
    test()
  }, [])

  const test = async () => {
    const checkResult = await checkTurnServer({
      urls: 'turn:13.214.139.81:3478',
      username: 'luukien',
      credential: '123456',
      timeoutSeconds: 5
    })

    console.log('TURN server check result:', checkResult)
  }

  return <div></div>
}

export default Test
