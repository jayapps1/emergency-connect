package com.gec.backend.messaging.arkesel;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ArkeselOtpClientTest {

    @Test
    void sendSms_simulationEnabled_returnsTrueInDevSimulatedMode() {
        ArkeselProperties props = new ArkeselProperties("", "SkiliteEnt");
        ArkeselSmsV2Client client = new ArkeselSmsV2Client(props, true);
        assertTrue(client.sendSms("+233541553337", "Test message"));
    }

    @Test
    void sendSms_unconfiguredAndNoSimulation_throwsIllegalStateException() {
        ArkeselProperties props = new ArkeselProperties("", "SkiliteEnt");
        ArkeselSmsV2Client client = new ArkeselSmsV2Client(props, false);
        assertThrows(IllegalStateException.class, () -> client.sendSms("+233541553337", "Test message"));
    }
}
