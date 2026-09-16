// src/components/domain/HeroTitle/HeroTitle.tsx
import { motion, type Variants } from 'framer-motion';
import './herotitle.css';

interface HeroTitleProps {
  lines: [string, string]; // exactly two lines — the "gap" opens between them
}

const topLineVariants: Variants = {
  hidden: { y: 0 },
  visible: {
    y: -6,
    transition: { duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const bottomLineVariants: Variants = {
  hidden: { y: 0 },
  visible: {
    y: 6,
    transition: { duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// The signature purple seam that grows to fill the gap between the two lines —
// a literal, on-brand visualization of "GAP" rather than a generic reveal.
const seamVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const textRevealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HeroTitle({ lines }: HeroTitleProps) {
  const [first, second] = lines;

  return (
    <div className="heroTitleWrap">
      <motion.div className="heroTitleTop" initial="hidden" animate="visible" variants={topLineVariants}>
        <motion.h1 className="heroTitleLine" variants={textRevealVariants}>
          {first}
        </motion.h1>
      </motion.div>

      {/* The seam — this is the "gap" the whole animation is built around */}
      <motion.span
        className="heroTitleSeam"
        initial="hidden"
        animate="visible"
        variants={seamVariants}
      />

 


      <motion.div className="heroTitleBottom" initial="hidden" animate="visible" variants={bottomLineVariants}>
        <motion.h1 className="heroTitleLine" variants={textRevealVariants}>
          {second}
        </motion.h1>
      </motion.div>
    </div>
  );
}