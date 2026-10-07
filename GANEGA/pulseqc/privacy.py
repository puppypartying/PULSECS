"""
PulseQC Privacy Module.
Enforces author pseudonymization/masking for privacy compliance.
Example: 'Budi Santoso' -> 'B*** S***'
"""

import re
from pulseqc.config import Config


def mask_author_name(author_name: str, force_mask: bool = None) -> str:
    """Mask reviewer author names to protect user privacy unless disabled."""
    should_mask = Config.PRIVACY_MASK_AUTHORS if force_mask is None else force_mask
    if not should_mask or not author_name:
        return author_name or "Anonymous"

    words = author_name.strip().split()
    masked_words = []
    for word in words:
        if len(word) <= 1:
            masked_words.append(word)
        elif len(word) == 2:
            masked_words.append(word[0] + "*")
        else:
            masked_words.append(word[0] + "***")

    return " ".join(masked_words)
