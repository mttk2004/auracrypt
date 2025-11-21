
import React from 'react';
import { CreateEntryPayload, DecryptedEntry, EntryType } from '../types';
import { 
    IconX, IconDeviceFloppy, IconWand, IconRefresh, 
    IconCheck, IconUser, IconLock, IconWorld, 
    IconCategory, IconNote, IconLink, IconEye, IconEyeOff,
    IconCreditCard, IconId, IconLogin
} from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/locales';
import { useEntryForm } from '../hooks/useEntryForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEntryPayload) => Promise<void>;
  entryToEdit?: DecryptedEntry | null;
}

export const EntryModal: React.FC<Props> = ({ isOpen, onClose, onSave, entryToEdit }) => {
  const { language, categories } = useStore();
  const t = translations[language].modal;
  const commonT = translations[language].common;

  const {
      entryType, setEntryType,
      serviceName, setServiceName,
      category, setCategory,
      notes, setNotes,
      username, setUsername,
      url, setUrl,
      password, setPassword,
      cardData, setCardData,
      identityData, setIdentityData,

      loading,
      showPassword, setShowPassword,
      showGenerator, setShowGenerator,
      genLength, setGenLength,
      includeNum, setIncludeNum,
      includeSym, setIncludeSym,
      generatedPass, generatePassword, useGeneratedPassword,
      handleUrlChange, handleUrlBlur, handleServiceNameChange,
      handleSubmit
  } = useEntryForm({ 
      entryToEdit, 
      isOpen, 
      onSave, 
      onSuccess: onClose 
  });

  if (!isOpen) return null;

  const TabButton = ({ type, icon: Icon, label }: { type: EntryType, icon: any, label: string }) => (
      <button
          type="button"
          onClick={() => setEntryType(type)}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold transition relative ${
              entryType === type 
              ? 'text-primary-600 dark:text-primary-500 bg-primary-50 dark:bg-primary-500/10' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-800'
          }`}
      >
          <Icon size={18} />
          {label}
          {entryType === type && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-500" />}
      </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm">
          <div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {entryToEdit ? commonT.edit : t.title}
             </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-dark-800">
            <TabButton type="login" icon={IconLogin} label={t.types.login} />
            <TabButton type="card" icon={IconCreditCard} label={t.types.card} />
            <TabButton type="identity" icon={IconId} label={t.types.identity} />
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="entry-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- COMMON FIELDS (Name & Category) --- */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                        {entryType === 'card' ? t.bankLabel : entryType === 'identity' ? t.idLabel : t.serviceLabel}
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {entryType === 'card' ? <IconCreditCard className="text-slate-400" size={18} /> : 
                             entryType === 'identity' ? <IconId className="text-slate-400" size={18} /> : 
                             <IconWorld className="text-slate-400" size={18} />}
                        </div>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm"
                            value={serviceName}
                            onChange={handleServiceNameChange}
                            placeholder={entryType === 'card' ? "e.g. Chase, Visa" : entryType === 'identity' ? "e.g. Drivers License" : "e.g. Facebook"}
                            autoFocus
                        />
                    </div>
                </div>
                
                <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.categoryLabel}</label>
                    <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconCategory className="text-slate-400" size={18} />
                        </div>
                        <select
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-8 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm appearance-none truncate"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- LOGIN FORM --- */}
            {entryType === 'login' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.usernameLabel}</label>
                            <div className="relative">
                                <IconUser className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>
                         <div className="md:col-span-6 space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.urlLabel}</label>
                            <div className="relative">
                                <IconLink className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                                    value={url}
                                    onChange={handleUrlChange}
                                    onBlur={handleUrlBlur}
                                    placeholder="website.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.passwordLabel}</label>
                            <button 
                                type="button"
                                onClick={() => setShowGenerator(!showGenerator)}
                                className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            >
                                <IconWand size={14} /> {showGenerator ? 'Hide' : t.genBtn}
                            </button>
                        </div>
                        <div className="relative">
                            <IconLock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-12 text-slate-900 dark:text-white font-mono focus:border-primary-500 outline-none"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                             <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                tabIndex={-1}
                            >
                                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                            </button>
                        </div>
                         {/* Password Generator Panel */}
                        {showGenerator && (
                            <div className="mt-3 p-4 bg-slate-50 dark:bg-dark-800/50 border border-slate-200 dark:border-dark-700 rounded-xl animate-in slide-in-from-top-2 duration-200">
                                <div className="flex gap-3 mb-3">
                                    <div className="flex-1 bg-white dark:bg-dark-900 p-2.5 rounded border border-slate-200 dark:border-dark-700 font-mono text-center">{generatedPass}</div>
                                    <button type="button" onClick={generatePassword} className="p-2.5 bg-slate-200 dark:bg-dark-700 rounded"><IconRefresh size={18}/></button>
                                </div>
                                <button type="button" onClick={useGeneratedPassword} className="w-full py-2 bg-primary-600 text-white rounded-lg font-bold text-sm">{t.usePassBtn}</button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- CARD FORM --- */}
            {entryType === 'card' && (
                 <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.cardholder}</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1"
                            value={cardData.cardholder}
                            onChange={e => setCardData({...cardData, cardholder: e.target.value})}
                            placeholder="NAME ON CARD"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.cardNumber}</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:border-primary-500 outline-none mt-1"
                            value={cardData.number}
                            onChange={e => setCardData({...cardData, number: e.target.value})}
                            placeholder="0000 0000 0000 0000"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.cardExp}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:border-primary-500 outline-none mt-1"
                                value={cardData.expiry}
                                onChange={e => setCardData({...cardData, expiry: e.target.value})}
                                placeholder="MM/YY"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.cardCvv}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:border-primary-500 outline-none mt-1"
                                value={cardData.cvv}
                                onChange={e => setCardData({...cardData, cvv: e.target.value})}
                                placeholder="123"
                            />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.cardPin}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:border-primary-500 outline-none mt-1"
                                value={cardData.pin}
                                onChange={e => setCardData({...cardData, pin: e.target.value})}
                                placeholder="****"
                            />
                        </div>
                    </div>
                 </div>
            )}

            {/* --- IDENTITY FORM --- */}
            {entryType === 'identity' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.fullName}</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1"
                            value={identityData.fullName}
                            onChange={e => setIdentityData({...identityData, fullName: e.target.value})}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.license}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1"
                                value={identityData.license}
                                onChange={e => setIdentityData({...identityData, license: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.passport}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1"
                                value={identityData.passport}
                                onChange={e => setIdentityData({...identityData, passport: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.address}</label>
                        <textarea
                            rows={2}
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1 resize-none"
                            value={identityData.address}
                            onChange={e => setIdentityData({...identityData, address: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.phone}</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:border-primary-500 outline-none mt-1"
                            value={identityData.phone}
                            onChange={e => setIdentityData({...identityData, phone: e.target.value})}
                        />
                    </div>
                </div>
            )}

            {/* Row 4: Notes */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{t.notesLabel}</label>
                <div className="relative group">
                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                        <IconNote className="text-slate-400 group-focus-within:text-primary-500 transition" size={18} />
                    </div>
                    <textarea
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-dark-700 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition shadow-sm resize-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Secure notes, PIN codes, etc."
                    />
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-900/50 backdrop-blur-sm flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-dark-800 font-medium transition"
            >
                {commonT.cancel}
            </button>
            <button 
                type="submit" 
                form="entry-form"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <IconCheck className="animate-spin" size={20}/> {t.encrypting}
                    </span>
                ) : (
                    <><IconDeviceFloppy size={20} /> {t.saveBtn}</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};