"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Building2, MapPin, Phone, Globe, Sparkles } from "lucide-react";
import type { ConsignmentPartner } from "@/lib/server-consignments";

type PartnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partnerToEdit?: ConsignmentPartner | null;
};

export function PartnerModal({ isOpen, onClose, onSuccess, partnerToEdit }: PartnerModalProps) {
  const isEditing = Boolean(partnerToEdit);

  const [name, setName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultCommissionType, setDefaultCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(20);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED">("ACTIVE");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (partnerToEdit) {
      setName(partnerToEdit.name ?? "");
      setCorporateName(partnerToEdit.corporateName ?? "");
      setTradeName(partnerToEdit.tradeName ?? "");
      setResponsibleName(partnerToEdit.responsibleName ?? "");
      setPhone(partnerToEdit.phone ?? "");
      setWhatsapp(partnerToEdit.whatsapp ?? "");
      setEmail(partnerToEdit.email ?? "");
      setDocument(partnerToEdit.document ?? "");
      setZipCode(partnerToEdit.zipCode ?? "");
      setStreet(partnerToEdit.street ?? "");
      setNumber(partnerToEdit.number ?? "");
      setComplement(partnerToEdit.complement ?? "");
      setNeighborhood(partnerToEdit.neighborhood ?? "");
      setCity(partnerToEdit.city ?? "");
      setState(partnerToEdit.state ?? "SP");
      setLatitude(partnerToEdit.latitude ?? undefined);
      setLongitude(partnerToEdit.longitude ?? undefined);
      setInstagram(partnerToEdit.instagram ?? "");
      setFacebook(partnerToEdit.facebook ?? "");
      setGoogleMapsUrl(partnerToEdit.googleMapsUrl ?? "");
      setLogoUrl(partnerToEdit.logoUrl ?? "");
      setDefaultCommissionType(partnerToEdit.defaultCommissionType ?? "PERCENTAGE");
      setDefaultCommissionRate(Number(partnerToEdit.defaultCommissionRate) || 20);
      setNotes(partnerToEdit.notes ?? "");
      setStatus(partnerToEdit.status ?? "ACTIVE");
    } else {
      setName("");
      setCorporateName("");
      setTradeName("");
      setResponsibleName("");
      setPhone("");
      setWhatsapp("");
      setEmail("");
      setDocument("");
      setZipCode("");
      setStreet("");
      setNumber("");
      setComplement("");
      setNeighborhood("");
      setCity("");
      setState("SP");
      setLatitude(undefined);
      setLongitude(undefined);
      setInstagram("");
      setFacebook("");
      setGoogleMapsUrl("");
      setLogoUrl("");
      setDefaultCommissionType("PERCENTAGE");
      setDefaultCommissionRate(20);
      setNotes("");
      setStatus("ACTIVE");
    }
    setError("");
  }, [partnerToEdit, isOpen]);

  // Consulta automática de CEP via ViaCEP
  const handleCepBlur = async () => {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        setCepLoading(true);
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setStreet(data.logradouro || street);
            setNeighborhood(data.bairro || neighborhood);
            setCity(data.localidade || city);
            setState(data.uf || state);
          }
        }
      } catch {
        // ignore
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do estabelecimento é obrigatório.");
      return;
    }
    if (!responsibleName.trim()) {
      setError("O nome do responsável é obrigatório.");
      return;
    }
    if (!phone.trim()) {
      setError("O telefone de contato é obrigatório.");
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError("Cidade e Estado são obrigatórios.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: name.trim(),
      corporateName: corporateName.trim() || undefined,
      tradeName: tradeName.trim() || undefined,
      responsibleName: responsibleName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      document: document.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      street: street.trim() || undefined,
      number: number.trim() || undefined,
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      instagram: instagram.trim() || undefined,
      facebook: facebook.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      defaultCommissionType,
      defaultCommissionRate: Number(defaultCommissionRate) || 0,
      notes: notes.trim() || undefined,
      status,
    };

    try {
      const url = isEditing
        ? `/api/consignments/locations/${partnerToEdit?.id}`
        : "/api/consignments/locations";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao salvar parceiro.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? "Editar Parceiro de Consignação" : "Novo Parceiro Comercial"}
              </h2>
              <p className="text-xs text-slate-400">
                Ponto de venda parceiro para distribuição de produtos consignados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Dados do Estabelecimento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Estabelecimento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Livraria & Café do Lago"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Silveira & Santos Comércio Ltda"
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Ex: Café Cultural"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ACTIVE">Ativo (Permite Envios e Vendas)</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="SUSPENDED">Suspenso (Bloqueado temporariamente)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contatos */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Phone className="h-4 w-4" /> Telefones & Contatos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Telefone Principal *</label>
                <input
                  type="text"
                  required
                  placeholder="(11) 3456-7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@parceiro.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Localização & Endereço */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Endereço & Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CEP {cepLoading && <span className="text-cyan-400 text-[10px]">(Buscando...)</span>}
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onBlur={handleCepBlur}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Logradouro / Rua</label>
                <input
                  type="text"
                  placeholder="Av. Paulista"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número</label>
                <input
                  type="text"
                  placeholder="1000"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Bela Vista"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cidade *</label>
                <input
                  type="text"
                  required
                  placeholder="São Paulo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Estado (UF) *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="SP"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Complemento</label>
                <input
                  type="text"
                  placeholder="Sala 402 / Loja B"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  placeholder="-23.55052"
                  value={latitude ?? ""}
                  onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0000001"
                  placeholder="-46.633308"
                  value={longitude ?? ""}
                  onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Link Google Maps</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Redes Sociais & Branding */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-4 w-4" /> Mídias Sociais & Identidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Instagram (@perfil)</label>
                <div className="flex rounded-lg border border-slate-700 bg-slate-900/80 overflow-hidden">
                  <span className="px-2.5 py-2 text-slate-500 text-sm bg-slate-800/50">@</span>
                  <input
                    type="text"
                    placeholder="lojaparceira"
                    value={instagram.replace(/^@/, "")}
                    onChange={(e) => setInstagram(e.target.value ? `@${e.target.value.replace(/^@/, "")}` : "")}
                    className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Facebook URL</label>
                <input
                  type="text"
                  placeholder="https://facebook.com/..."
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Logo do Estabelecimento</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Regra de Comissão Padrão */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Comissão Padrão do Parceiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Modelo de Comissão</label>
                <select
                  value={defaultCommissionType}
                  onChange={(e) => setDefaultCommissionType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="PERCENTAGE">Percentual (%) sobre o valor de venda</option>
                  <option value="FIXED">Valor Fixo (R$) por unidade vendida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {defaultCommissionType === "PERCENTAGE" ? "Taxa de Comissão (%)" : "Valor Fixo por Item (R$)"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={defaultCommissionType === "PERCENTAGE" ? "100" : undefined}
                    value={defaultCommissionRate}
                    onChange={(e) => setDefaultCommissionRate(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                    {defaultCommissionType === "PERCENTAGE" ? "%" : "R$"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações Gerais & Acordo Comercial
            </label>
            <textarea
              rows={3}
              placeholder="Instruções de entrega, horário de funcionamento, contatos secundários..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-sm font-bold text-white transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Parceiro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
