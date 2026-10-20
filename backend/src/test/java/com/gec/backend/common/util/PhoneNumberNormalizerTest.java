package com.gec.backend.common.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PhoneNumberNormalizerTest {

    @Test
    void normalize_localNumberWithTrunkZero_returnsCanonicalE164() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("0541553337"));
    }

    @Test
    void normalize_nationalNumberWithoutZero_returnsCanonicalE164() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("541553337"));
    }

    @Test
    void normalize_numberWithCountryCodeNoPlus_returnsCanonicalE164() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("233541553337"));
    }

    @Test
    void normalize_alreadyCanonicalE164_returnsSame() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("+233541553337"));
    }

    @Test
    void normalize_accidentalDuplicatePrefix_collapsesToCanonicalE164() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("+2330541553337"));
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("2330541553337"));
    }

    @Test
    void normalize_spacedOrFormattedInput_stripsFormatting() {
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("054 155 3337"));
        assertEquals("+233541553337", PhoneNumberNormalizer.normalize("+233 (54) 155-3337"));
    }

    @Test
    void normalize_shortEmergencyCode_preservesDigits() {
        assertEquals("112", PhoneNumberNormalizer.normalize("112"));
        assertEquals("192", PhoneNumberNormalizer.normalize("192"));
    }

    @Test
    void normalize_nullOrBlank_returnsNull() {
        assertNull(PhoneNumberNormalizer.normalize(null));
        assertNull(PhoneNumberNormalizer.normalize(""));
        assertNull(PhoneNumberNormalizer.normalize("   "));
    }
}
