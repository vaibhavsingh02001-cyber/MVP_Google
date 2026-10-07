# Recall — User Testing Protocol & Evaluation Guide

> **Phase 6:** User Testing Readiness & Verification  
> **Goal:** Validate that external participants can retrieve vague photo memories with zero guidance across all 5 evaluation tasks.

---

## 1. Study Setup & Protocol

### Participant Profile
- **Target:** 3–5 external participants (not members of the core development team).
- **Environment:** Clean incognito browser window (desktop or mobile viewport).
- **URL:** `http://localhost:3000` (or deployed staging URL).
- **Facilitator Script:**
  > *"We are testing a prototype search experience for photo libraries. You will be given 5 scenarios where you are trying to find a specific photo from your past, but you only have a hazy memory of it. Use the application naturally as if searching your own library. Please think aloud as you interact with the system."*

### Rules for the Observer
1. **Zero Prompting:** Do not explain the mode switcher, cluster cards, or question chips.
2. **Observe Confusion Points:** Record any moment where the participant hesitates for > 5 seconds or clicks a control without understanding its purpose.
3. **Capture Outcome:** Record whether the photo was found, how many turns were taken, and whether they used the narrowing chips or "Not this" actions.

---

## 2. The 5 Evaluation Task Cards

| Task # | Scenario Given to Participant | Target Photo Description | Success Criteria |
|--------|------------------------------|--------------------------|------------------|
| **Task 1** | *"You need to find a photo of a cafe receipt from a trip to Japan to submit an expense report."* | Paper receipt on wooden table in Kyoto cafe (`kyoto_cafe_receipt.jpg`) | Found in ≤ 3 turns. App clusters cafe moments. |
| **Task 2** | *"You are trying to find the prescription box photo from when you caught the flu last winter."* | Cough syrup / paracetamol blister pack on nightstand (`flu_medicine_jan2024.jpg`) | Found in ≤ 3 turns. App narrows from medical items. |
| **Task 3** | *"You want to locate the resignation email or job offer screenshot from when you switched companies in spring 2023."* | Laptop screen showing resignation email draft (`job_change_screenshot_mar2023.png`) | Found in ≤ 3 turns. App detects document / text intent. |
| **Task 4** | *"You want to find the photo from your cousin's wedding where they were cutting the cake under fairy lights."* | Bride & groom cutting tiered cake outdoors under string lights (`cousin_wedding_cake_dec2023.jpg`) | Found in ≤ 3 turns. App groups wedding celebration. |
| **Task 5** | *"You remember taking a photo at dinner right after spending the afternoon at the beach."* | Seafood platter at dusk on restaurant patio (`post_beach_dinner_jul2023.jpg`) | Found in ≤ 3 turns. User can use timeline anchor or question. |

---

## 3. Observation & Metric Recording Sheet

| Participant ID | Task # | Mode Used | Clue Typed | Turns Used | Time (s) | Answer Chip Used? | "Not This" Used? | Outcome (Found / Skipped / Abandoned) |
|----------------|--------|-----------|------------|------------|----------|-------------------|------------------|---------------------------------------|
| P1 | 1 | Recall | "Kyoto coffee receipt" | 1 | 8s | No | No | Found |
| P1 | 2 | Recall | "Medicine when sick" | 2 | 14s | Yes ("Last winter") | No | Found |
| P1 | 3 | Recall | "Resignation screenshot" | 1 | 6s | No | No | Found |
| P1 | 4 | Recall | "Cousin wedding cake" | 2 | 12s | Yes ("Outdoor") | No | Found |
| P1 | 5 | Recall | "Dinner after beach" | 2 | 15s | Yes | Yes ("Earlier") | Found |

---

## 4. Qualitative Confusion Rubric

Record observations against these 5 UX friction points:

1. **Clue Formulation Friction:** Did the user struggle to write a natural sentence? Did they default to rigid boolean keywords?
2. **Cluster Comprehension:** Did the user understand what the cluster cards represented (episodes vs individual results)?
3. **Question Engagement:** Did the user notice and understand the narrowing question chips?
4. **Timeline Anchor Pivot:** Did the user understand how to pivot with "Earlier" / "Later" or the Anchor modal?
5. **Confirmation Friction:** Was it immediately clear how to mark the photo as found ("That's It!")?

---

## 5. Post-Test Debrief Questions

1. *"How did this compare to your usual experience searching in Google Photos or Apple Photos?"*
2. *"Did the questions the system asked make sense based on what you typed?"*
3. *"Were the cluster groupings helpful or did you prefer seeing all photos flat?"*
4. *"What was the single most confusing element of the interface?"*
