'use client';

import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: '$0',
    period: '/mes',
    description: 'Perfecto para empezar',
    icon: Zap,
    gradient: 'from-gray-700 to-gray-800',
    features: [
      { text: 'Contenido limitado con anuncios', included: true },
      { text: 'Calidad estándar (480p)', included: true },
      { text: '1 dispositivo', included: true },
      { text: 'Sin descargas', included: false },
      { text: 'Acceso a contenido premium', included: false },
      { text: 'Sin anuncios', included: false },
    ],
    cta: 'Plan Actual',
    current: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$4.99',
    period: '/mes',
    description: 'La mejor experiencia',
    icon: Sparkles,
    gradient: 'from-red-700 to-red-900',
    features: [
      { text: 'Todo el catálogo', included: true },
      { text: 'Calidad HD (1080p)', included: true },
      { text: '2 dispositivos simultáneos', included: true },
      { text: 'Descargas offline', included: true },
      { text: 'Acceso a contenido premium', included: true },
      { text: 'Sin anuncios', included: false },
    ],
    cta: 'Elegir Premium',
    popular: true,
  },
  {
    id: 'vip',
    name: 'VIP',
    price: '$9.99',
    period: '/mes',
    description: 'Experiencia completa',
    icon: Crown,
    gradient: 'from-yellow-700 to-amber-900',
    features: [
      { text: 'Todo el catálogo', included: true },
      { text: 'Calidad 4K Ultra HD', included: true },
      { text: '4 dispositivos simultáneos', included: true },
      { text: 'Descargas offline ilimitadas', included: true },
      { text: 'Acceso anticipado a estrenos', included: true },
      { text: 'Sin anuncios', included: true },
    ],
    cta: 'Elegir VIP',
  },
];

const comparisonFeatures = [
  { feature: 'Calidad de video', free: '480p', premium: '1080p HD', vip: '4K Ultra HD' },
  { feature: 'Dispositivos', free: '1', premium: '2', vip: '4' },
  { feature: 'Descargas', free: 'No', premium: 'Sí', vip: 'Ilimitadas' },
  { feature: 'Sin anuncios', free: 'No', premium: 'No', vip: 'Sí' },
  { feature: 'Contenido premium', free: 'No', premium: 'Sí', vip: 'Sí' },
  { feature: 'Estrenos anticipados', free: 'No', premium: 'No', vip: 'Sí' },
  { feature: 'Soporte prioritario', free: 'No', premium: 'No', vip: 'Sí' },
];

export default function PricingView() {
  const { userPlan, setCurrentView } = useAppStore();

  const handleSelectPlan = (planId: string) => {
    if (planId === userPlan) return;
    // In a real app this would call a payment API
    alert(`Plan "${planId}" seleccionado. (Demo - integración de pago pendiente)`);
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Elige tu <span className="text-red-500">Plan Perfecto</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Disfruta del mejor contenido latinoamericano con la calidad que mereces.
            Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, index) => {
            const isCurrent = userPlan === plan.id;
            const Icon = plan.icon;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative rounded-2xl overflow-hidden ${
                  plan.popular ? 'md:-mt-4 md:mb-4' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="bg-red-600 text-white text-center text-xs font-bold py-1.5 tracking-wider uppercase">
                      Más Popular
                    </div>
                  </div>
                )}

                <div
                  className={`bg-gradient-to-b ${plan.gradient} p-6 sm:p-8 h-full flex flex-col ${
                    plan.popular ? 'pt-12' : ''
                  } border ${
                    isCurrent ? 'border-white/30' : 'border-white/10'
                  } rounded-2xl`}
                >
                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          plan.id === 'vip'
                            ? 'bg-yellow-500/20'
                            : plan.id === 'premium'
                            ? 'bg-red-500/20'
                            : 'bg-white/10'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            plan.id === 'vip'
                              ? 'text-yellow-400'
                              : plan.id === 'premium'
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        <p className="text-gray-400 text-xs">{plan.description}</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature.text} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? 'text-gray-200' : 'text-gray-500'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent}
                    className={`w-full h-11 font-medium rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-white/10 text-gray-400 cursor-default'
                        : plan.id === 'premium'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
                        : plan.id === 'vip'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/25'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    {isCurrent && (
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30 mr-2">
                        Actual
                      </Badge>
                    )}
                    {isCurrent ? 'Plan Actual' : plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Comparación de Planes
          </h2>

          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 pb-4 border-b border-white/10">
                <div className="text-gray-400 text-sm font-medium">Función</div>
                <div className="text-center text-white text-sm font-bold">Gratis</div>
                <div className="text-center text-red-400 text-sm font-bold">Premium</div>
                <div className="text-center text-yellow-400 text-sm font-bold">VIP</div>
              </div>

              {/* Table Rows */}
              {comparisonFeatures.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-4 gap-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors px-2 rounded"
                >
                  <div className="text-gray-300 text-sm">{row.feature}</div>
                  <div className="text-center text-gray-400 text-sm">{row.free}</div>
                  <div className="text-center text-gray-200 text-sm">{row.premium}</div>
                  <div className="text-center text-white text-sm font-medium">{row.vip}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-10">
            <Button
              onClick={() => setCurrentView('home')}
              variant="outline"
              className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Volver al Inicio
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
