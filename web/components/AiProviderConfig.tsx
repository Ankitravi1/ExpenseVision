import React, { useState } from 'react';
import { Icon } from './Icon';

// Reusable multi-provider AI config UI (provider select, models, API keys).
// Used by the Admin platform-AI card so it matches the per-user AI settings.
// Operates on a plain value + onChange so it stays presentational.

export interface AiProviderConfigValue {
    provider: string;
    model: string;
    keys: Record<string, string[]>;
    customModels: Record<string, string[]>;
    baseUrl: Record<string, string>;
}

const DEFAULT_PROVIDERS = ['deepseek', 'openai', 'gemini', 'openrouter'];

const BASE_URL_HINTS: Record<string, string> = {
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com/v1',
    gemini: 'https://generativelanguage.googleapis.com',
    openrouter: 'https://openrouter.ai/api/v1',
};

export const AiProviderConfig: React.FC<{
    value: AiProviderConfigValue;
    onChange: (v: AiProviderConfigValue) => void;
}> = ({ value, onChange }) => {
    const [newModelInput, setNewModelInput] = useState('');
    const [newKeyInput, setNewKeyInput] = useState('');
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

    const { provider } = value;

    const customConfiguredProviders = Array.from(new Set([
        ...Object.keys(value.keys || {}),
        ...Object.keys(value.customModels || {}),
        ...Object.keys(value.baseUrl || {}),
    ])).filter(p => !DEFAULT_PROVIDERS.includes(p) && p !== 'custom' && p.trim() !== '');

    const isCustom = !DEFAULT_PROVIDERS.includes(provider) || provider === 'custom';
    const providerModels = value.customModels[provider] || [];
    const providerKeys = value.keys[provider] || [];

    const selectProvider = (p: string) => {
        setRevealedKeys({});
        setNewModelInput('');
        setNewKeyInput('');
        const next = p === 'custom' ? '' : p;
        onChange({ ...value, provider: next, model: (value.customModels[next] || [])[0] || '' });
    };

    const setCustomProviderName = (name: string) => {
        const val = name.trim() || 'custom';
        onChange({ ...value, provider: val, model: (value.customModels[val] || [])[0] || '' });
    };

    const setBaseUrl = (url: string) => onChange({ ...value, baseUrl: { ...value.baseUrl, [provider]: url } });

    const addModel = () => {
        const val = newModelInput.trim();
        if (!val || providerModels.includes(val)) return;
        onChange({ ...value, model: val, customModels: { ...value.customModels, [provider]: [...providerModels, val] } });
        setNewModelInput('');
    };
    const removeModel = (m: string) => {
        const updated = providerModels.filter(x => x !== m);
        onChange({ ...value, model: value.model === m ? (updated[0] || '') : value.model, customModels: { ...value.customModels, [provider]: updated } });
    };

    const addKey = () => {
        const val = newKeyInput.trim();
        if (!val) return;
        onChange({ ...value, keys: { ...value.keys, [provider]: [...providerKeys, val] } });
        setNewKeyInput('');
    };
    const removeKey = (index: number) => {
        onChange({ ...value, keys: { ...value.keys, [provider]: providerKeys.filter((_, i) => i !== index) } });
    };
    const setActiveKey = (index: number) => {
        if (index <= 0) return;
        const arr = [...providerKeys];
        const [sel] = arr.splice(index, 1);
        arr.unshift(sel);
        onChange({ ...value, keys: { ...value.keys, [provider]: arr } });
    };

    return (
        <div className="space-y-5">
            {/* Provider selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                <select
                    value={DEFAULT_PROVIDERS.includes(provider) || customConfiguredProviders.includes(provider) ? provider : 'custom'}
                    onChange={e => selectProvider(e.target.value)}
                    className="block w-full bg-gray-100 border-transparent rounded-lg p-3 focus:ring-2 focus:ring-primary focus:bg-white text-base dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-600 outline-none"
                >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                    {customConfiguredProviders.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="custom">Add Provider (works with most AI providers)</option>
                </select>
                {BASE_URL_HINTS[provider] && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Uses base URL: {BASE_URL_HINTS[provider]}</p>
                )}
            </div>

            {/* Custom provider name + base URL */}
            {isCustom && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Provider Name</label>
                        <input
                            type="text"
                            value={provider === 'custom' ? '' : provider}
                            onChange={e => setCustomProviderName(e.target.value)}
                            placeholder="e.g. groq"
                            className="block w-full bg-gray-100 border-transparent rounded-lg p-3 text-base dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base URL</label>
                        <input
                            type="text"
                            value={value.baseUrl[provider] || ''}
                            onChange={e => setBaseUrl(e.target.value)}
                            placeholder="https://api.groq.com/openai/v1"
                            className="block w-full bg-gray-100 border-transparent rounded-lg p-3 text-base dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Models */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 capitalize">Models for {provider || 'custom'}</p>
                {providerModels.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">No models added yet. Add one below to select it.</p>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {providerModels.map(m => (
                            <div
                                key={m}
                                onClick={() => onChange({ ...value, model: m })}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none ${value.model === m ? 'bg-primary text-white border-primary shadow' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary dark:hover:text-emerald-300'}`}
                            >
                                <span>{m}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); removeModel(m); }}
                                    className={`rounded-full p-0.5 ${value.model === m ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                                    aria-label={`Remove model ${m}`}
                                >
                                    <Icon name="X" size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newModelInput}
                        onChange={e => setNewModelInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel(); } }}
                        placeholder="Add model name (e.g. gpt-4o-mini)"
                        className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:text-gray-100 focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button type="button" onClick={addModel} className="btn btn-secondary whitespace-nowrap text-sm py-2">
                        <Icon name="Plus" size={15} className="mr-1" /> Add
                    </button>
                </div>
            </div>

            {/* API Keys */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 capitalize">API Keys for {provider || 'custom'}</p>
                <div className="space-y-2 mb-3">
                    {providerKeys.map((key, index) => {
                        const revealed = revealedKeys[`${provider}-${index}`];
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveKey(index)}
                                    className={`p-2 rounded-lg border flex items-center justify-center ${index === 0 ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 border-gray-200 dark:border-gray-600'}`}
                                    title="Set as active key"
                                >
                                    <Icon name="Star" size={15} className={index === 0 ? 'fill-current' : ''} />
                                </button>
                                <input
                                    type="text"
                                    value={revealed ? key : '•••••••••••••' + (key.length > 3 ? key.slice(-3) : key)}
                                    readOnly
                                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono dark:text-gray-100"
                                />
                                <button type="button" className="btn btn-secondary p-2" onClick={() => setRevealedKeys(prev => ({ ...prev, [`${provider}-${index}`]: !prev[`${provider}-${index}`] }))} title="Reveal / Hide">
                                    <Icon name={revealed ? 'EyeOff' : 'Eye'} size={15} />
                                </button>
                                <button type="button" className="btn btn-danger p-2 text-white" onClick={() => removeKey(index)} title="Delete Key">
                                    <Icon name="Trash2" size={15} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newKeyInput}
                        onChange={e => setNewKeyInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKey(); } }}
                        placeholder="Add new API key (sk-...)"
                        className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none dark:text-gray-100"
                    />
                    <button type="button" onClick={addKey} className="btn btn-secondary whitespace-nowrap text-sm py-2">
                        <Icon name="Plus" size={15} className="mr-1" /> Add
                    </button>
                </div>
            </div>
        </div>
    );
};
