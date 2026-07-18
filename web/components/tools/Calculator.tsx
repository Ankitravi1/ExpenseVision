import React, { useEffect, useState } from 'react';
import { Icon } from '../Icon';

// A small, self-contained calculator. Standard four-function + %, sign flip,
// decimal, clear, backspace. Keyboard support while focused.
export const Calculator: React.FC = () => {
    const [display, setDisplay] = useState('0');
    const [prev, setPrev] = useState<number | null>(null);
    const [op, setOp] = useState<string | null>(null);
    const [overwrite, setOverwrite] = useState(true);

    const compute = (a: number, b: number, operator: string): number => {
        switch (operator) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return b === 0 ? NaN : a / b;
            default: return b;
        }
    };

    const inputDigit = (d: string) => {
        setDisplay(cur => (overwrite || cur === '0') ? d : cur + d);
        setOverwrite(false);
    };
    const inputDot = () => {
        if (overwrite) { setDisplay('0.'); setOverwrite(false); return; }
        setDisplay(cur => (cur.includes('.') ? cur : cur + '.'));
    };
    const clearAll = () => { setDisplay('0'); setPrev(null); setOp(null); setOverwrite(true); };
    const backspace = () => {
        if (overwrite) return;
        setDisplay(cur => (cur.length > 1 ? cur.slice(0, -1) : '0'));
    };
    const percent = () => setDisplay(cur => String(parseFloat(cur) / 100));
    const flipSign = () => setDisplay(cur => String(parseFloat(cur) * -1));

    const chooseOp = (nextOp: string) => {
        const current = parseFloat(display);
        if (prev !== null && op && !overwrite) {
            const result = compute(prev, current, op);
            setDisplay(String(result));
            setPrev(result);
        } else {
            setPrev(current);
        }
        setOp(nextOp);
        setOverwrite(true);
    };
    const equals = () => {
        if (prev === null || !op) return;
        const result = compute(prev, parseFloat(display), op);
        setDisplay(Number.isFinite(result) ? String(result) : 'Error');
        setPrev(null);
        setOp(null);
        setOverwrite(true);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key;
            if (k >= '0' && k <= '9') inputDigit(k);
            else if (k === '.') inputDot();
            else if (k === '+') chooseOp('+');
            else if (k === '-') chooseOp('-');
            else if (k === '*') chooseOp('×');
            else if (k === '/') { e.preventDefault(); chooseOp('÷'); }
            else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
            else if (k === 'Backspace') backspace();
            else if (k === 'Escape') clearAll();
            else if (k === '%') percent();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const Btn: React.FC<{ label: React.ReactNode; onClick: () => void; variant?: 'num' | 'op' | 'fn' | 'eq'; className?: string }> = ({ label, onClick, variant = 'num', className = '' }) => {
        const styles = {
            num: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
            op: 'bg-primary/10 hover:bg-primary/20 text-primary dark:text-indigo-300 font-bold',
            fn: 'bg-gray-200/60 hover:bg-gray-300/60 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300',
            eq: 'bg-primary hover:bg-primary-hover text-white font-bold',
        }[variant];
        return (
            <button type="button" onClick={onClick} className={`h-12 rounded-xl text-lg font-semibold transition-colors flex items-center justify-center ${styles} ${className}`}>
                {label}
            </button>
        );
    };

    return (
        <div className="space-y-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-5 text-right">
                <div className="text-xs h-4 text-gray-400 dark:text-gray-500 tabular-nums">
                    {prev !== null && op ? `${prev} ${op}` : ''}
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white truncate tabular-nums" title={display}>{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <Btn label="AC" onClick={clearAll} variant="fn" />
                <Btn label="±" onClick={flipSign} variant="fn" />
                <Btn label="%" onClick={percent} variant="fn" />
                <Btn label="÷" onClick={() => chooseOp('÷')} variant="op" />

                <Btn label="7" onClick={() => inputDigit('7')} />
                <Btn label="8" onClick={() => inputDigit('8')} />
                <Btn label="9" onClick={() => inputDigit('9')} />
                <Btn label="×" onClick={() => chooseOp('×')} variant="op" />

                <Btn label="4" onClick={() => inputDigit('4')} />
                <Btn label="5" onClick={() => inputDigit('5')} />
                <Btn label="6" onClick={() => inputDigit('6')} />
                <Btn label="−" onClick={() => chooseOp('-')} variant="op" />

                <Btn label="1" onClick={() => inputDigit('1')} />
                <Btn label="2" onClick={() => inputDigit('2')} />
                <Btn label="3" onClick={() => inputDigit('3')} />
                <Btn label="+" onClick={() => chooseOp('+')} variant="op" />

                <Btn label="0" onClick={() => inputDigit('0')} className="col-span-2" />
                <Btn label="." onClick={inputDot} />
                <Btn label="=" onClick={equals} variant="eq" />
            </div>
            <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">Tip: use your keyboard too</p>
        </div>
    );
};
