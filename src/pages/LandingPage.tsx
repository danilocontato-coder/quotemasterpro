import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, Shield, Zap, Users, BarChart3, FileText, Clock, Target, Handshake, Star, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"

export default function LandingPage() {
  const features = [
    {
      icon: FileText,
      title: "Gestão Inteligente de Cotações",
      description: "Crie, gerencie e acompanhe cotações com facilidade. Sistema completo de RFQ com templates personalizáveis."
    },
    {
      icon: Users,
      title: "Rede de Fornecedores Qualificados",
      description: "Acesse uma ampla rede de fornecedores pré-qualificados e expanda suas opções de compra."
    },
    {
      icon: BarChart3,
      title: "Análises e Relatórios Avançados",
      description: "Tome decisões baseadas em dados com relatórios detalhados de performance e economia."
    },
    {
      icon: Shield,
      title: "Conformidade e Auditoria",
      description: "Mantenha total rastreabilidade e conformidade com logs de auditoria completos."
    },
    {
      icon: Zap,
      title: "Automação de Processos",
      description: "Automatize fluxos de aprovação e notificações para acelerar seus processos de compra."
    },
    {
      icon: Handshake,
      title: "Negociação Assistida por IA",
      description: "Otimize seus resultados com nossa IA que identifica oportunidades de economia."
    }
  ]

  const benefits = [
    {
      title: "Transparência Total",
      description: "Visibilidade completa de todo o processo de compra, desde a solicitação até a entrega.",
      icon: Target
    },
    {
      title: "Economia Comprovada",
      description: "Reduza custos em até 30% com comparações automáticas e negociações inteligentes.",
      icon: TrendingUp
    },
    {
      title: "Tempo Otimizado",
      description: "Acelere processos de compra em até 60% com automação e workflows inteligentes.",
      icon: Clock
    }
  ]

  const testimonials = [
    {
      name: "Carlos Silva",
      position: "Gerente de Compras",
      company: "TechCorp",
      content: "O QuoteMaster revolucionou nossos processos. Conseguimos uma economia de 25% já no primeiro trimestre.",
      rating: 5
    },
    {
      name: "Ana Santos",
      position: "Diretora Financeira", 
      company: "Construtora Alpha",
      content: "A transparência e controle que temos agora é incomparável. Recomendo para qualquer empresa séria.",
      rating: 5
    },
    {
      name: "Roberto Lima",
      position: "CEO",
      company: "IndustrialMax",
      content: "A IA de negociação nos surpreendeu. Resultados que não conseguíamos nem manualmente.",
      rating: 5
    }
  ]

  const plans = [
    {
      name: "Básico",
      price: "R$ 99",
      period: "/mês",
      description: "Para pequenas empresas",
      features: [
        "50 cotações/mês",
        "10 fornecedores",
        "Relatórios básicos",
        "Suporte por email"
      ]
    },
    {
      name: "Profissional",
      price: "R$ 299", 
      period: "/mês",
      description: "Para empresas em crescimento",
      features: [
        "200 cotações/mês",
        "50 fornecedores",
        "IA de negociação",
        "Relatórios avançados",
        "Suporte prioritário"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Customizado",
      period: "",
      description: "Para grandes corporações",
      features: [
        "Cotações ilimitadas",
        "Fornecedores ilimitados",
        "IA personalizada",
        "Integração ERP",
        "Suporte dedicado"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-xl">QuoteMaster Pro</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#beneficios" className="text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#depoimentos" className="text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link to="/auth/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth/register">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-6 animate-fade-in">
            Plataforma Líder em Gestão de Cotações
          </Badge>
          
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
            Transforme suas <span className="text-primary">Compras Corporativas</span> com Inteligência
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 animate-fade-in" style={{animationDelay: '0.4s'}}>
            O QuoteMaster Pro é a plataforma definitiva para gestão de cotações e compras corporativas. 
            Mais transparência, eficiência e economia para sua empresa.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{animationDelay: '0.6s'}}>
            <Link to="/auth/register">
              <Button size="lg" className="text-lg px-8">
                Começar Teste Gratuito
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Agendar Demo
            </Button>
          </div>

          <div className="mt-12 text-sm text-muted-foreground animate-fade-in" style={{animationDelay: '0.8s'}}>
            <p>✅ Teste gratuito por 30 dias • ✅ Sem cartão de crédito • ✅ Suporte especializado</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="hover-scale">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">30%</div>
              <div className="text-muted-foreground">Redução de Custos</div>
            </div>
            <div className="hover-scale">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">60%</div>
              <div className="text-muted-foreground">Tempo Economizado</div>
            </div>
            <div className="hover-scale">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Empresas Confiantes</div>
            </div>
            <div className="hover-scale">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime Garantido</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tudo que sua empresa precisa em uma plataforma
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recursos poderosos projetados para otimizar seus processos de compra e gerar resultados excepcionais.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover-scale border-muted transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Benefícios</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Por que escolher o QuoteMaster Pro?
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center hover-scale">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <benefit.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-muted-foreground text-lg">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Como Funciona</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Simples, rápido e eficiente
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center hover-scale">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold">1</div>
              <h3 className="font-semibold mb-2">Crie sua Cotação</h3>
              <p className="text-sm text-muted-foreground">Defina seus requisitos e especificações</p>
            </div>
            <div className="text-center hover-scale">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold">2</div>
              <h3 className="font-semibold mb-2">Convide Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Envie para sua rede ou descubra novos parceiros</p>
            </div>
            <div className="text-center hover-scale">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold">3</div>
              <h3 className="font-semibold mb-2">Compare Propostas</h3>
              <p className="text-sm text-muted-foreground">Analise com IA e tome decisões inteligentes</p>
            </div>
            <div className="text-center hover-scale">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold">4</div>
              <h3 className="font-semibold mb-2">Feche o Negócio</h3>
              <p className="text-sm text-muted-foreground">Aprove, processe e acompanhe a entrega</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover-scale">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.position}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Planos</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Escolha o plano ideal para sua empresa
            </h2>
            <p className="text-xl text-muted-foreground">
              Flexibilidade para empresas de todos os tamanhos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`hover-scale ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                <CardHeader>
                  {plan.popular && (
                    <Badge className="mb-2 self-start">Mais Popular</Badge>
                  )}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.name === "Enterprise" ? "Falar com Vendas" : "Começar Agora"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Pronto para revolucionar suas compras?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Junte-se a centenas de empresas que já transformaram seus processos de compra com o QuoteMaster Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Começar Teste Gratuito
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Agendar Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">Q</span>
                </div>
                <span className="font-bold text-xl">QuoteMaster Pro</span>
              </div>
              <p className="text-muted-foreground text-sm">
                A plataforma líder em gestão de cotações e compras corporativas.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Comunidade</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 QuoteMaster Pro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}