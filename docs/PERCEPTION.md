# Component 2: Perception & Multi-modal Interaction

## 1. Overview
The Interaction layer acts as the bridge between the robot’s "thoughts" and the human user. It handles high-fidelity voice synthesis, visual recognition of the environment, and the social "Selfie" logic.

## 2. Voice & Speech (ElevenLabs Integration)
To ensure the robot feels "alive," we implement a streaming audio pipeline.
- **Dynamic TTS:** Instead of waiting for the full LLM response, we stream text chunks to ElevenLabs to minimize latency.
- **Personality Injection:** The system prompt forces the LLM to include "vocal cues" (e.g., "[short pause]" or "Wow!") to make the ElevenLabs output sound more natural.
- **Multi-language Support:** While starting with English, the ElevenLabs `v2` multilingual model is used to allow easy switching based on the user's detected language.

## 3. Visual Reasoning (Nebius VLM)
This module enables the robot to "see" what it is pointing at.
- **Vision Loop:** The G1 head camera captures a frame when the robot reaches a waypoint.
- **VLM Analysis:** The frame is sent to a Vision-Language Model (like Moondream or Llava) hosted on **Nebius GPU instances**.
- **Context Verification:** The VLM confirms if the object in front of the robot matches the "landmark" described in the Redis database (e.g., "I see a bronze plaque").

## 4. The "Social Agent" (Selfies & Photos)
The "Selfie" feature is the primary engagement tool for the user.
- **Human Detection:** Uses a lightweight YOLO or MediaPipe model to detect when the user is standing next to the robot.
- **Pose Coordination:** The robot triggers a pre-set "Pose" movement (e.g., a slight tilt of the head and a wave).
- **Image Capture & Delivery:** 1. Capture high-res frame.
    2. Backend uploads the image to a temporary bucket.
    3. The frontend (Map Page) updates via WebSockets to show the user their photo instantly.

## 5. Feature Integration Flow
1. **Trigger:** Robot reaches a destination.
2. **Action:** "Look" -> VLM identifies object -> LLM generates speech.
3. **Execution:** ElevenLabs plays audio -> Robot arm points to (x, y) coordinates identified by VLM.
4. **Conclusion:** "Would you like a selfie?" -> If yes, trigger Selfie Module.

## 6. Technical Requirements
- **Hardware:** Unitree G1 Front Camera.
- **APIs:** ElevenLabs SDK, OpenAI-compatible VLM endpoint on Nebius.
- **Latency Target:** < 2s for VLM reasoning; < 800ms for TTS start.