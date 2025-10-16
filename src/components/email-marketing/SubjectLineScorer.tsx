import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface SubjectLineScorerProps {
  subjectLine: string;
}

export function SubjectLineScorer({ subjectLine }: SubjectLineScorerProps) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    analyzeSubject(subjectLine);
  }, [subjectLine]);

  const analyzeSubject = (subject: string) => {
    let currentScore = 50;
    const newFeedback: string[] = [];
    const newWarnings: string[] = [];

    if (!subject || subject.trim().length === 0) {
      setScore(0);
      setFeedback([]);
      setWarnings(['Digite um assunto para análise']);
      return;
    }

    // Comprimento ideal: 40-50 caracteres
    if (subject.length >= 40 && subject.length <= 50) {
      currentScore += 15;
      newFeedback.push('Comprimento ideal');
    } else if (subject.length < 40) {
      currentScore -= 5;
      newWarnings.push('Assunto muito curto (ideal: 40-50 caracteres)');
    } else if (subject.length > 60) {
      currentScore -= 10;
      newWarnings.push('Assunto muito longo (pode ser cortado em mobile)');
    }

    // Personalização
    if (subject.includes('{{') || subject.toLowerCase().includes('você')) {
      currentScore += 10;
      newFeedback.push('Contém personalização');
    }

    // Números e dados específicos
    if (/\d+/.test(subject)) {
      currentScore += 5;
      newFeedback.push('Contém números (aumenta atenção)');
    }

    // Urgência moderada
    if (/hoje|agora|última chance/i.test(subject)) {
      currentScore += 5;
      newFeedback.push('Cria senso de urgência');
    }

    // Palavras de spam
    const spamWords = ['grátis', 'free', 'urgente', 'clique aqui', '100%', 'garantido'];
    const hasSpam = spamWords.some(word => subject.toLowerCase().includes(word));
    if (hasSpam) {
      currentScore -= 20;
      newWarnings.push('Contém palavras que podem acionar filtros de spam');
    }

    // Excesso de maiúsculas
    const upperCount = (subject.match(/[A-Z]/g) || []).length;
    if (upperCount > subject.length * 0.3) {
      currentScore -= 15;
      newWarnings.push('Muitas letras maiúsculas');
    }

    // Excesso de pontuação
    const punctuationCount = (subject.match(/[!?]/g) || []).length;
    if (punctuationCount > 2) {
      currentScore -= 10;
      newWarnings.push('Excesso de pontos de exclamação/interrogação');
    }

    // Emoji (pode ajudar ou prejudicar)
    if (/[\u{1F300}-\u{1F9FF}]/u.test(subject)) {
      currentScore += 5;
      newFeedback.push('Contém emoji (pode aumentar engajamento)');
    }

    setScore(Math.max(0, Math.min(100, currentScore)));
    setFeedback(newFeedback);
    setWarnings(newWarnings);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'hsl(var(--success))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) return { label: 'Excelente', variant: 'default' as const };
    if (score >= 50) return { label: 'Bom', variant: 'secondary' as const };
    return { label: 'Precisa Melhorar', variant: 'destructive' as const };
  };

  const scoreBadge = getScoreBadge(score);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Análise do Assunto
          </CardTitle>
          <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Score de Qualidade</span>
            <span className="font-bold">{score}/100</span>
          </div>
          <Progress value={score} className="h-2" style={{ backgroundColor: getScoreColor(score) }} />
        </div>

        {feedback.length > 0 && (
          <div className="space-y-2">
            {feedback.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {!subjectLine && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Digite um assunto para receber análise em tempo real
          </p>
        )}
      </CardContent>
    </Card>
  );
}