/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, getLocalDeviceId } from './supabase';
import { Medication, Pharmacy, PriceRecord } from './types';
import { 
  differenceInDays, 
  parseISO, 
  format, 
  addDays, 
  startOfDay, 
  compareDesc
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Pill, 
  Calendar, 
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Store,
  History,
  TrendingDown,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  return (
    <MedicationApp />
  );
}

function MedicationApp() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'prices'>('stock');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const userId = useMemo(() => getLocalDeviceId(), []);

  // Data states
  const [medications, setMedications] = useState<Medication[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>([]);

  // Unique data for rendering
  const uniqueMedications = useMemo(() => medications, [medications]);
  const uniquePharmacies = useMemo(() => pharmacies, [pharmacies]);
  const uniquePriceRecords = useMemo(() => priceRecords, [priceRecords]);

  // UI states
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [isAddingPharmacy, setIsAddingPharmacy] = useState(false);
  const [isRefilling, setIsRefilling] = useState<string | null>(null);

  // Form states - Medication
  const [newName, setNewName] = useState('');
  const [newPrescription, setNewPrescription] = useState('1');
  const [newTotal, setNewTotal] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form states - Price
  const [priceMedId, setPriceMedId] = useState('');
  const [pricePharmacyId, setPricePharmacyId] = useState('');
  const [priceValue, setPriceValue] = useState('');
  const [priceDate, setPriceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form states - Pharmacy
  const [pharmacyName, setPharmacyName] = useState('');

  // Refill state
  const [refillAmount, setRefillAmount] = useState('');

  const fetchData = async () => {
    try {
      const [meds, phars, prices] = await Promise.all([
        supabase.from('medications').select('*').eq('user_id', userId),
        supabase.from('pharmacies').select('*').eq('user_id', userId),
        supabase.from('price_records').select('*').eq('user_id', userId)
      ]);

      if (meds.data) setMedications(meds.data.map(m => ({
        id: m.id,
        name: m.name,
        pillsPerDay: m.pills_per_day,
        totalPills: m.total_pills,
        startDate: m.start_date,
        userId: m.user_id
      })));

      if (phars.data) setPharmacies(phars.data.map(p => ({
        id: p.id,
        name: p.name,
        userId: p.user_id
      })));

      if (prices.data) setPriceRecords(prices.data.map(pr => ({
        id: pr.id,
        medicationId: pr.medication_id,
        pharmacyId: pr.pharmacy_id,
        price: pr.price,
        date: pr.date,
        userId: pr.user_id
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `user_id=eq.${userId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies', filter: `user_id=eq.${userId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_records', filter: `user_id=eq.${userId}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDate = startOfDay(parseISO(newDate)).toISOString();
      const { error } = await supabase.from('medications').insert({
        name: newName,
        pills_per_day: parseFloat(newPrescription),
        total_pills: parseInt(newTotal),
        start_date: startDate,
        user_id: userId
      });

      if (error) throw error;
      
      setNewName('');
      setNewPrescription('1');
      setNewTotal('');
      setNewDate(format(new Date(), 'yyyy-MM-dd'));
      setIsAddingMed(false);
    } catch (error) {
      console.error('Error adding medication:', error);
    }
  };

  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName.trim()) return;

    try {
      const { error } = await supabase.from('pharmacies').insert({
        name: pharmacyName,
        user_id: userId
      });
      if (error) throw error;
      setPharmacyName('');
      setIsAddingPharmacy(false);
    } catch (error) {
      console.error('Error adding pharmacy:', error);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceMedId || !pricePharmacyId || !priceValue) return;

    try {
      const date = startOfDay(parseISO(priceDate)).toISOString();
      const { error } = await supabase.from('price_records').insert({
        medication_id: priceMedId,
        pharmacy_id: pricePharmacyId,
        price: parseFloat(priceValue),
        date: date,
        user_id: userId
      });
      
      if (error) throw error;
      
      setPriceMedId('');
      setPricePharmacyId('');
      setPriceValue('');
      setPriceDate(format(new Date(), 'yyyy-MM-dd'));
      setIsAddingPrice(false);
    } catch (error) {
      console.error('Error adding price record:', error);
    }
  };

  const handleRefill = async (med: Medication) => {
    const amount = parseInt(refillAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const currentStock = calculateStock(med).current;
      const newTotal = currentStock + amount;
      const newStartDate = startOfDay(new Date()).toISOString();

      const { error } = await supabase.from('medications').update({
        total_pills: newTotal,
        start_date: newStartDate
      }).eq('id', med.id);

      if (error) throw error;

      setIsRefilling(null);
      setRefillAmount('');
    } catch (error) {
      console.error('Error refilling:', error);
    }
  };

  const handleDeleteMed = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este medicamento?')) return;
    try {
      await supabase.from('medications').delete().eq('id', id);
    } catch (error) {
      console.error('Error deleting medication:', error);
    }
  };

  const handleDeletePrice = async (id: string) => {
    if (!window.confirm('Excluir este registro de preço?')) return;
    try {
      await supabase.from('price_records').delete().eq('id', id);
    } catch (error) {
      console.error('Error deleting price record:', error);
    }
  };

  const handleDeletePharmacy = async (id: string) => {
    if (!window.confirm('Excluir esta farmácia?')) return;
    try {
      await supabase.from('pharmacies').delete().eq('id', id);
    } catch (error) {
      console.error('Error deleting pharmacy:', error);
    }
  };

  const calculateStock = (med: Medication) => {
    const start = parseISO(med.startDate);
    const today = startOfDay(new Date());
    const daysPassed = Math.max(0, differenceInDays(today, start));
    const consumed = daysPassed * med.pillsPerDay;
    const current = Math.max(0, med.totalPills - consumed);
    const daysRemaining = med.pillsPerDay > 0 ? Math.floor(current / med.pillsPerDay) : 0;
    const endDate = addDays(today, daysRemaining);

    return {
      current,
      daysRemaining,
      endDate,
      isLow: daysRemaining <= 7,
      isOut: daysRemaining === 0
    };
  };

  const getBestPrice = (medId: string) => {
    const records = priceRecords.filter(r => r.medicationId === medId);
    if (records.length === 0) return null;
    return records.reduce((prev, curr) => prev.price < curr.price ? prev : curr);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-slate-900 text-lg">Estoque da Mamãe</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('stock')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'stock' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Estoque
              </button>
              <button 
                onClick={() => setActiveTab('prices')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'prices' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Preços
              </button>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Configurações"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'stock' ? (
          <>
            {/* Summary Alerts */}
            <div className="space-y-4 mb-8">
              {uniqueMedications.map(med => {
                const stock = calculateStock(med);
                if (stock.isLow) {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`alert-${med.id}`}
                      className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3",
                        stock.isOut 
                          ? "bg-red-50 border-red-100 text-red-800" 
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      )}
                    >
                      <AlertTriangle className={cn("w-5 h-5 mt-0.5", stock.isOut ? "text-red-600" : "text-amber-600")} />
                      <div>
                        <p className="font-bold">Atenção!</p>
                        <p className="text-sm">
                          O medicamento <span className="font-semibold">{med.name}</span> {stock.isOut ? 'acabou hoje!' : `termina em ${stock.daysRemaining} dias.`}
                        </p>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              })}
            </div>

            {/* Medication List */}
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {uniqueMedications.map(med => {
                  const stock = calculateStock(med);
                  const bestPrice = getBestPrice(med.id);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={med.id}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{med.name}</h3>
                          <p className="text-sm text-slate-500">Prescrição: {med.pillsPerDay} por dia</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteMed(med.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-grow space-y-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Estoque Atual</p>
                            <p className="text-3xl font-black text-slate-900">
                              {stock.current.toFixed(1)} <span className="text-sm font-normal text-slate-500">un</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Duração</p>
                            <p className={cn(
                              "text-lg font-bold",
                              stock.isLow ? "text-amber-600" : "text-blue-600"
                            )}>
                              {stock.daysRemaining} dias
                            </p>
                          </div>
                        </div>

                        {bestPrice && (
                          <div className="bg-emerald-50 p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-700 uppercase">Melhor Preço</span>
                            </div>
                            <p className="text-sm font-bold text-emerald-800">
                              R$ {bestPrice.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}

                        <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-600">
                            Término: <span className="font-semibold">{format(stock.endDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-2">
                        {isRefilling === med.id ? (
                          <div className="flex gap-2 w-full">
                            <input 
                              autoFocus
                              type="number"
                              placeholder="Qtd"
                              className="flex-grow bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              value={refillAmount}
                              onChange={(e) => setRefillAmount(e.target.value)}
                            />
                            <button 
                              onClick={() => handleRefill(med)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                              Ok
                            </button>
                            <button 
                              onClick={() => { setIsRefilling(null); setRefillAmount(''); }}
                              className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-colors"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsRefilling(med.id)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                          >
                            <PlusCircle className="w-5 h-5" />
                            Repor Estoque
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Price Module Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Histórico de Preços</h2>
                <p className="text-slate-500">Acompanhe onde é mais barato comprar.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAddingPharmacy(true)}
                  className="flex-grow sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  <Store className="w-5 h-5" />
                  Farmácias
                </button>
                <button 
                  onClick={() => setIsAddingPrice(true)}
                  className="flex-grow sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  <Plus className="w-5 h-5" />
                  Novo Preço
                </button>
              </div>
            </div>

            {/* Best Prices Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              {uniqueMedications.map(med => {
                const best = getBestPrice(med.id);
                if (!best) return null;
                const pharmacy = uniquePharmacies.find(p => p.id === best.pharmacyId);
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`best-summary-${med.id}`}
                    className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"
                  >
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Melhor Preço: {med.name}</p>
                    <p className="text-2xl font-black text-emerald-900">
                      R$ {best.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1 font-medium truncate">
                      {pharmacy?.name || 'Farmácia desconhecida'}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Price Records List */}
            <div className="space-y-4">
              {uniqueMedications.map(med => {
                const medPrices = uniquePriceRecords
                  .filter(r => r.medicationId === med.id)
                  .sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));

                if (medPrices.length === 0) return null;

                const bestPrice = getBestPrice(med.id);

                return (
                  <div key={`prices-group-${med.id}`} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Pill className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-slate-900">{med.name}</h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase">{medPrices.length} registros</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {medPrices.map(record => {
                        const pharmacy = uniquePharmacies.find(p => p.id === record.pharmacyId);
                        const isBest = bestPrice && record.id === bestPrice.id;
                        return (
                          <div key={record.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                isBest ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                              )}>
                                <Store className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800">{pharmacy?.name || 'Farmácia desconhecida'}</p>
                                  {isBest && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">Melhor</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">{format(parseISO(record.date), "dd/MM/yyyy")}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className={cn(
                                "text-lg font-black",
                                isBest ? "text-emerald-600" : "text-slate-900"
                              )}>
                                R$ {record.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <button 
                                onClick={() => handleDeletePrice(record.id)}
                                className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {priceRecords.length === 0 && (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Nenhum preço registrado</h3>
                  <p className="text-slate-500">Comece a cadastrar os preços para economizar.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-30">
        <button 
          onClick={() => setActiveTab('stock')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'stock' ? "text-blue-600" : "text-slate-400"
          )}
        >
          <Pill className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Estoque</span>
        </button>
        <button 
          onClick={() => setActiveTab('prices')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'prices' ? "text-blue-600" : "text-slate-400"
          )}
        >
          <DollarSign className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Preços</span>
        </button>
      </div>

      {/* FAB (Stock Tab) */}
      {activeTab === 'stock' && !isAddingMed && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
          <button 
            onClick={() => setIsAddingMed(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-6 h-6" />
            Novo Medicamento
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {/* Add Medication Modal */}
        {isAddingMed && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Novo Medicamento</h2>
                <button onClick={() => setIsAddingMed(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <RefreshCw className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddMedication} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Medicamento</label>
                  <input required type="text" placeholder="Ex: Losartana" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Toma por dia</label>
                    <input required type="number" step="0.5" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={newPrescription} onChange={(e) => setNewPrescription(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Atual</label>
                    <input required type="number" placeholder="Ex: 60" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data de Início/Contagem</label>
                  <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Salvar Medicamento
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Price Modal */}
        {isAddingPrice && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Registrar Preço</h2>
                <button onClick={() => setIsAddingPrice(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <RefreshCw className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddPrice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Medicamento</label>
                  <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={priceMedId} onChange={(e) => setPriceMedId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {uniqueMedications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Farmácia</label>
                    <button type="button" onClick={() => setIsAddingPharmacy(true)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">+ Nova Farmácia</button>
                  </div>
                  <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={pricePharmacyId} onChange={(e) => setPricePharmacyId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {uniquePharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço (R$)</label>
                    <input required type="number" step="0.01" placeholder="0,00" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
                    <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white transition-all outline-none" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Salvar Preço
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Pharmacy Modal */}
        {isAddingPharmacy && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-4">Gerenciar Farmácias</h2>
              <form onSubmit={handleAddPharmacy} className="flex gap-2 mb-6">
                <input required type="text" placeholder="Nome da farmácia" className="flex-grow bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm focus:border-blue-500 transition-all outline-none" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              </form>
              <div className="max-h-48 overflow-y-auto space-y-2 mb-6">
                {uniquePharmacies.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-700">{p.name}</span>
                    <button 
                      onClick={() => handleDeletePharmacy(p.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {uniquePharmacies.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Nenhuma farmácia cadastrada.</p>}
              </div>
              <button onClick={() => setIsAddingPharmacy(false)} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                Fechar
              </button>
            </motion.div>
          </div>
        )}

        {/* Settings Modal (Backup/Restore) */}
        {showSettings && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-2">Identidade do Dispositivo</h2>
              <p className="text-sm text-slate-500 mb-6">Seus dados são salvos na nuvem usando este ID único. Guarde-o se quiser acessar de outro dispositivo.</p>
              
              <div className="bg-slate-50 p-4 rounded-xl mb-6 flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-slate-600 break-all select-all">{userId}</code>
                <button 
                  onClick={handleCopyId}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Concluído
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
