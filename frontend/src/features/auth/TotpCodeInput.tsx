import React, { useRef, useState, useEffect } from 'react';
import { Box, TextField, Typography, CircularProgress } from '@mui/material';

interface TotpCodeInputProps {
  length?: number;
  disabled?: boolean;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
}

/**
 * Reusable 6-digit TOTP input component with auto-focus, backspace, paste, and auto-completion.
 * Automatically verifies once all six TOTP digits are present.
 */
export const TotpCodeInput: React.FC<TotpCodeInputProps> = ({
  length = 6,
  disabled = false,
  onComplete,
  autoFocus = true,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isRequestingGuard = useRef(false);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const char = numericValue.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-focus next input box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check for completion
    const fullCode = newDigits.join('');
    if (fullCode.length === length && !isRequestingGuard.current) {
      isRequestingGuard.current = true;
      onComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pastedData) return;

    const newDigits = Array(length).fill('');
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setDigits(newDigits);

    if (pastedData.length === length && !isRequestingGuard.current) {
      isRequestingGuard.current = true;
      inputRefs.current[length - 1]?.focus();
      onComplete(pastedData);
    } else if (pastedData.length < length) {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  // Reset digits on error
  useEffect(() => {
    if (!disabled && isRequestingGuard.current) {
      isRequestingGuard.current = false;
      setDigits(Array(length).fill(''));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [disabled, length]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, my: 2 }}>
      <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'center' }} onPaste={handlePaste}>
        {digits.map((digit, idx) => (
          <TextField
            key={idx}
            inputRef={(el) => (inputRefs.current[idx] = el)}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            inputProps={{
              maxLength: 1,
              inputMode: 'numeric',
              pattern: '[0-9]*',
              autoComplete: 'one-time-code',
              style: {
                textAlign: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                padding: '12px 0',
                width: '44px',
                height: '44px',
              },
              'aria-label': `Digit ${idx + 1} of ${length}`,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
              },
            }}
          />
        ))}
      </Box>

      {disabled && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary" fontWeight="bold">
            Verifying authenticator code...
          </Typography>
        </Box>
      )}
    </Box>
  );
};
