import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { HeroSection } from "../components/landing/HeroSection";
import { ProgressIndicator } from "../components/landing/ProgressIndicator";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { FaqSection } from "../components/landing/FaqSection";
import { TypeStep } from "../components/landing/steps/TypeStep";
import { FruitStep } from "../components/landing/steps/FruitStep";
import { StyleStep } from "../components/landing/steps/StyleStep";
import { ResultStep } from "../components/landing/steps/ResultStep";
import type { DrinkType } from "../lib/calc";

export function Landing() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const calcRef = useRef<HTMLDivElement>(null);

  const [type, setType] = useState<DrinkType | null>(null);
  const [fruit, setFruit] = useState<string | null>(null);
  const [waterL, setWaterL] = useState(10);
  const [targetAbv, setTargetAbv] = useState<number | null>(null);

  const handleSelectType = (t: DrinkType) => {
    setType(t);
    setTargetAbv(null); // moc zależy od typu — wyczyść przy zmianie
  };

  const handleStart = () => {
    setShowCalculator(true);
    setCurrentStep(0);
    setTimeout(
      () => calcRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  };

  const canProceed = () => {
    if (currentStep === 0) return !!type;
    if (currentStep === 1) return !!fruit && waterL >= 3;
    if (currentStep === 2) return targetAbv !== null;
    return false;
  };

  const next = () =>
    canProceed() && currentStep < 3 && setCurrentStep(currentStep + 1);
  const prev = () => currentStep > 0 && setCurrentStep(currentStep - 1);
  const restart = () => {
    setCurrentStep(0);
    setType(null);
    setFruit(null);
    setWaterL(10);
    setTargetAbv(null);
  };

  return (
    <>
      <HeroSection onStart={handleStart} />

      {showCalculator && (
        <div ref={calcRef} id="calculator" className="scroll-mt-8">
          <ProgressIndicator
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <TypeStep key="s0" selected={type} onSelect={handleSelectType} />
            )}
            {currentStep === 1 && (
              <FruitStep
                key="s1"
                fruit={fruit}
                waterL={waterL}
                onFruitChange={setFruit}
                onWaterChange={setWaterL}
              />
            )}
            {currentStep === 2 && type && (
              <StyleStep
                key="s2"
                type={type}
                targetAbv={targetAbv}
                onSelect={setTargetAbv}
              />
            )}
            {currentStep === 3 && type && fruit && targetAbv !== null && (
              <ResultStep
                key="s3"
                type={type}
                fruit={fruit}
                waterL={waterL}
                targetAbv={targetAbv}
                onRestart={restart}
              />
            )}
          </AnimatePresence>

          {currentStep < 3 && (
            <div className="mx-auto flex max-w-2xl justify-between px-4 pb-16">
              <button
                onClick={prev}
                disabled={currentStep === 0}
                className="rounded-xl border-2 border-stone-300 px-6 py-3 font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-30"
              >
                Wstecz
              </button>
              <button
                onClick={next}
                disabled={!canProceed()}
                className="rounded-xl bg-[var(--color-bordo)] px-8 py-3 font-semibold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                Dalej
              </button>
            </div>
          )}
        </div>
      )}

      <HowItWorksSection />
      <FaqSection />
    </>
  );
}
