import React, { useState, useEffect } from "react";

export type OnboardingStep = {
  targetId: string;
  title: string;
  desc: string;
  preferredPosition: "right" | "bottom" | "left" | "top";
};

const STEPS: OnboardingStep[] = [
  {
    targetId: "tour-sidebar",
    title: "🗂️ Navegación Principal",
    desc: "Este es el panel lateral de SupplyAI. Úsalo para moverte entre los diferentes módulos del sistema, tales como tu Inventario en tiempo real, Proveedores, Forecast predictivo con IA, Rutas de logística, Alertas y más.",
    preferredPosition: "right"
  },
  {
    targetId: "tour-summary-btn",
    title: "🤖 Diagnóstico Ejecutivo con IA",
    desc: "Presiona este botón para generar un diagnóstico instantáneo redactado por nuestra IA. Analizará desabastecimientos de stock, riesgos y rutas críticas en un abrir y cerrar de ojos.",
    preferredPosition: "bottom"
  },
  {
    targetId: "tour-alerts-card",
    title: "⚠️ Alertas y Riesgos Activos",
    desc: "Monitorea aquí las irregularidades de tu red. Cuando existan desabastecimientos proyectados o excesos, SupplyAI los listará aquí. ¡Puedes resolverlos delegándoselos a la IA con un solo clic!",
    preferredPosition: "left"
  },
  {
    targetId: "tour-inventario-search",
    title: "🔍 Filtros de Búsqueda y Categorías",
    desc: "Aquí en tu inventario puedes buscar productos rápidamente por nombre o SKU. Puedes filtrar tu catálogo por categorías o estados críticos (como stock bajo, agotados o activos) usando los botones rápidos.",
    preferredPosition: "bottom"
  },
  {
    targetId: "tour-inventario-select-header",
    title: "☑️ Selección Múltiple y Pedidos",
    desc: "Utiliza las casillas de verificación (ahora siempre visibles y transparentes) para seleccionar varios artículos a la vez. Al hacerlo, podrás realizar pedidos en bloque consolidados de forma inmediata.",
    preferredPosition: "bottom"
  },
  {
    targetId: "tour-proveedores-card",
    title: "🤝 Catálogo de Proveedores",
    desc: "En este módulo puedes administrar tu directorio de proveedores. Al hacer clic derecho sobre un proveedor, puedes configurar su número de WhatsApp/email y vincular sus productos para compras inmediatas.",
    preferredPosition: "right"
  },
  {
    targetId: "tour-movimientos-card",
    title: "📊 Historial de Entradas y Salidas",
    desc: "Registra cada venta, merma o abastecimiento de stock aquí. Este historial alimenta al Forecast Predictivo para estimar la demanda futura con total exactitud y evitar quiebres de stock.",
    preferredPosition: "bottom"
  },
  {
    targetId: "tour-topbar-actions",
    title: "⚙️ Personalización y Ajustes",
    desc: "Desde aquí puedes cambiar al modo oscuro, revisar notificaciones rápidas y acceder a Ajustes en cualquier momento. Allí podrás activar o desactivar este tutorial interactivo cuando quieras.",
    preferredPosition: "bottom"
  }
];

interface OnboardingTourProps {
  onClose: () => void;
  onNavToSection: (sectionId: string) => void;
}

export default function OnboardingTour({ onClose, onNavToSection }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const step = STEPS[stepIndex];

  // Asegurar que estemos en la vista correcta según el paso activo
  useEffect(() => {
    let sectionId = "dashboard";
    if (stepIndex === 3 || stepIndex === 4) {
      sectionId = "inventario";
    } else if (stepIndex === 5) {
      sectionId = "proveedores";
    } else if (stepIndex === 6) {
      sectionId = "movimientos";
    }
    onNavToSection(sectionId);
  }, [stepIndex, onNavToSection]);

  // Manejar redimensionado y cálculo de coordenadas del spotlight
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setRect(null);
        return;
      }

      const el = document.getElementById(step.targetId);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // Pequeño timeout para dar tiempo a que se renderice el DOM si cambiamos de vista
    const timer = setTimeout(handleResize, 100);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, { capture: true });

    // requestAnimationFrame loop para mantener el spotlight 100% pegado al elemento al hacer scroll o transiciones
    let animId: number;
    const updateLoop = () => {
      const el = document.getElementById(step.targetId);
      if (el && window.innerWidth >= 1024) {
        const newRect = el.getBoundingClientRect();
        setRect(prev => {
          if (!prev || 
              prev.top !== newRect.top || 
              prev.left !== newRect.left || 
              prev.width !== newRect.width || 
              prev.height !== newRect.height) {
            return newRect;
          }
          return prev;
        });
      }
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, { capture: true } as any);
      cancelAnimationFrame(animId);
    };
  }, [stepIndex, step.targetId]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("supplyai_onboarding_completed", "true");
    onClose();
  };

  // Calcular la posición del Tooltip flotante al lado del elemento seleccionado
  const getTooltipStyle = (): React.CSSProperties => {
    if (isMobile || !rect) {
      // Centrado móvil interactivo
      return {
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: 360,
        position: "fixed"
      };
    }

    const margin = 20;
    const tooltipWidth = 320;
    const tooltipHeight = 220; // Estimación aproximada para el cálculo

    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    switch (step.preferredPosition) {
      case "right":
        left = rect.right + margin;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case "left":
        left = rect.left - tooltipWidth - margin;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case "bottom":
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.bottom + margin;
        break;
      case "top":
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - tooltipHeight - margin;
        break;
    }

    // Colisión con los bordes de la ventana
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (top < 16) top = 16;
    if (top + tooltipHeight > window.innerHeight - 16) {
      top = window.innerHeight - tooltipHeight - 16;
    }

    return {
      top,
      left,
      position: "fixed"
    };
  };

  return (
    <>
      {/* Fondo difuminado y con recorte SVG para spotlight en desktop */}
      {!isMobile && rect ? (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 99998,
            pointerEvents: "none"
          }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {/* Recorte exacto con borde suavizado en el elemento */}
              <rect
                x={rect.left - 6}
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx={12}
                ry={12}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 15, 22, 0.65)"
            mask="url(#spotlight-mask)"
            style={{ backdropFilter: "blur(4px)", pointerEvents: "auto" }}
          />
        </svg>
      ) : (
        // Overlay difuminado plano para móvil o si no hay coordenadas de elemento
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 15, 22, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99998
          }}
        />
      )}

      {/* Borde pulsante alrededor del spotlight en desktop */}
      {!isMobile && rect && (
        <div
          className="onboarding-pulse"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 14
          }}
        />
      )}

      {/* Tarjeta de consejos (Tooltip) */}
      <div className="onboarding-tooltip" style={getTooltipStyle()}>
        <div className="onboarding-tooltip-header">
          <span className="onboarding-title">{step.title}</span>
          <button
            onClick={handleComplete}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--text-dim)",
              padding: 0
            }}
            title="Omitir tutorial"
          >
            ×
          </button>
        </div>

        <p className="onboarding-desc">{step.desc}</p>

        <div className="onboarding-footer">
          {/* Indicadores de progreso (Puntos) */}
          <div className="onboarding-progress">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`onboarding-dot ${i === stepIndex ? "active" : ""}`}
              />
            ))}
          </div>

          {/* Acciones del tutorial */}
          <div className="onboarding-actions">
            {stepIndex > 0 ? (
              <button className="onboarding-btn-secondary" onClick={handlePrev}>
                Atrás
              </button>
            ) : (
              <button className="onboarding-btn-text" onClick={handleComplete}>
                Omitir
              </button>
            )}
            <button className="onboarding-btn-primary" onClick={handleNext}>
              {stepIndex === STEPS.length - 1 ? "¡Entendido!" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

