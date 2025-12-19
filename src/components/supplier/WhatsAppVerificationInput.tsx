import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, MessageCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WhatsAppVerificationInputProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: (verified: boolean, verificationId?: string) => void;
  disabled?: boolean;
  error?: string;
}

type VerificationState = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

export const WhatsAppVerificationInput: React.FC<WhatsAppVerificationInputProps> = ({
  phone,
  onPhoneChange,
  onVerified,
  disabled = false,
  error
}) => {
  const [state, setState] = useState<VerificationState>('idle');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Phone mask
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onPhoneChange(formatted);
    if (state === 'verified') {
      setState('idle');
      onVerified(false);
      setCode(['', '', '', '', '', '']);
    }
  };

  const handleSendCode = async () => {
    if (!isValidPhone(phone)) {
      toast.error('Digite um número de WhatsApp válido');
      return;
    }

    setState('sending');
    setVerificationError(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-phone-verification', {
        body: { phone: phone.replace(/\D/g, '') }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro ao enviar código');
      }

      setState('sent');
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      toast.success('Código enviado via WhatsApp!');
      
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setState('error');
      setVerificationError(err.message);
      toast.error(err.message);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      handleVerifyCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerifyCode(pastedData);
    }
  };

  const handleVerifyCode = async (fullCode: string) => {
    setState('verifying');
    setVerificationError(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: { phone: phone.replace(/\D/g, ''), code: fullCode }
      });

      if (error || !data?.verified) {
        throw new Error(data?.error || error?.message || 'Código inválido');
      }

      setState('verified');
      onVerified(true, data.verificationId);
      toast.success('WhatsApp verificado com sucesso!');
    } catch (err: any) {
      setState('sent');
      setVerificationError(err.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.error(err.message);
    }
  };

  const handleResendCode = () => {
    setCode(['', '', '', '', '', '']);
    setVerificationError(null);
    handleSendCode();
  };

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="space-y-4">
      {/* Campo de Telefone */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone">WhatsApp</Label>
        <div className="relative">
          <Input
            id="whatsapp-phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            disabled={disabled || state === 'verified'}
            placeholder="(00) 00000-0000"
            className={cn(
              "pr-10 h-11",
              state === 'verified' && "border-green-500 bg-green-50 dark:bg-green-950/20",
              error && "border-destructive"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {state === 'verified' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <MessageCircle className="h-5 w-5 text-green-600" />
            )}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Botão Enviar Código ou Status Verificado */}
      {state === 'idle' || state === 'error' ? (
        <Button
          type="button"
          onClick={handleSendCode}
          disabled={!isValidPhone(phone) || disabled}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Enviar código via WhatsApp
        </Button>
      ) : state === 'sending' ? (
        <Button type="button" disabled className="w-full bg-green-600 text-white">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Enviando código...
        </Button>
      ) : state === 'verified' ? (
        <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">WhatsApp verificado</span>
        </div>
      ) : (
        /* Estado: sent ou verifying */
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Digite o código de 6 dígitos enviado para <strong>{phone}</strong>
            </p>
          </div>

          {/* Inputs do código */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={state === 'verifying'}
                className={cn(
                  "w-12 h-12 text-center text-xl font-bold",
                  verificationError && "border-destructive"
                )}
              />
            ))}
          </div>

          {/* Erro de verificação */}
          {verificationError && (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              <span>{verificationError}</span>
            </div>
          )}

          {/* Estado de verificação */}
          {state === 'verifying' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando...</span>
            </div>
          )}

          {/* Reenviar código */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Reenviar código em {formatCountdown()}
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={state === 'verifying'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reenviar código
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
