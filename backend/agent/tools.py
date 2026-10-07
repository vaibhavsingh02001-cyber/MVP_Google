"""
backend/agent/tools.py
========================
Claude tool definitions (JSON schemas) for the Recall agent.

These are passed as the `tools` parameter to the Anthropic messages.create() call.
Each tool corresponds to a function in orchestrator.py.
"""

TOOLS: list[dict] = [
    {
        "name": "search_library",
        "description": (
            "Search the photo metadata database with structured filters. "
            "Always call this FIRST before clustering or asking questions. "
            "Returns up to 100 matching photo IDs with their metadata."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "time_range": {
                    "type": "object",
                    "description": "Date range to filter photos by timestamp.",
                    "properties": {
                        "from": {"type": "string", "description": "Start date YYYY-MM-DD"},
                        "to":   {"type": "string", "description": "End date YYYY-MM-DD"},
                    },
                    "required": ["from", "to"],
                },
                "locations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Location name fragments, e.g. ['Goa', 'Panjim']",
                },
                "objects": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Things likely visible in the photo, e.g. ['cafe', 'rain']",
                },
                "mood_tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Atmospheric words, e.g. ['rainy', 'cozy', 'crowded']",
                },
                "purpose_tags": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["receipt", "reminder", "proof", "memory"],
                    },
                    "description": "Photo purpose category.",
                },
                "people": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Relationship labels only: ['cousin', 'bride', 'friend']",
                },
                "episode": {
                    "type": "string",
                    "description": "Exact episode label if clearly matched, e.g. 'Goa Trip Nov 2023'",
                },
            },
        },
    },
    {
        "name": "cluster_episodes",
        "description": (
            "Group photo candidates into 3–5 named clusters, each with a one-line "
            "match reason tied to the user's own clue words. Call this after search_library."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "photo_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "IDs of candidate photos to cluster (from search_library result).",
                },
                "user_clue": {
                    "type": "string",
                    "description": "The user's original memory clue (verbatim).",
                },
            },
            "required": ["photo_ids", "user_clue"],
        },
    },
    {
        "name": "ask_next_question",
        "description": (
            "Return the single most discriminating yes/no or multiple-choice question "
            "to split the remaining clusters most evenly. "
            "Do NOT call this if turns_used >= 3."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "clusters": {
                    "type": "array",
                    "description": "Current cluster list (from cluster_episodes).",
                },
                "turns_used": {
                    "type": "integer",
                    "description": "Number of question turns already used this session (max 3).",
                },
                "asked_questions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Questions already asked this session (to avoid repeats).",
                },
            },
            "required": ["clusters", "turns_used"],
        },
    },
    {
        "name": "exclude_similar",
        "description": (
            "Remove a photo or cluster from candidates based on user feedback "
            "('not_this', 'earlier', 'later', 'more_like_this') and return "
            "updated search filters. Call this when the user gives feedback."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "excluded_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Photo IDs or cluster IDs the user rejected.",
                },
                "signal": {
                    "type": "string",
                    "enum": ["not_this", "earlier", "later", "more_like_this"],
                    "description": "The type of feedback signal from the user.",
                },
                "current_filters": {
                    "type": "object",
                    "description": "The filters currently in use (to refine from).",
                },
                "free_text": {
                    "type": "string",
                    "description": "Any additional free-text the user typed with their feedback.",
                },
            },
            "required": ["excluded_ids", "signal"],
        },
    },
    {
        "name": "set_anchor",
        "description": (
            "Set a known photo as a timeline anchor and return a time window "
            "for 'before', 'after', or 'same_day' searches relative to it."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "anchor_photo_id": {
                    "type": "string",
                    "description": "ID of the photo to use as the timeline anchor.",
                },
                "relation": {
                    "type": "string",
                    "enum": ["before", "after", "same_day"],
                    "description": "Time relationship relative to the anchor photo.",
                },
            },
            "required": ["anchor_photo_id", "relation"],
        },
    },
]
