'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Crown,
  Shield,
  Pencil,
  Lock,
  LogOut,
  Check,
  Loader2,
  Eye,
  EyeOff,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';

export default function ProfileView() {
  const {
    userName,
    userEmail,
    userPlan,
    userRole,
    userCreatedAt,
    login,
    setCurrentView,
  } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Change password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    // In a real app this would update the user profile via API
    setTimeout(() => {
      login(
        useAppStore.getState().authToken || '',
        {
          id: useAppStore.getState().userId,
          name: editName,
          email: editEmail,
          plan: userPlan,
          role: userRole,
        }
      );
      setSaving(false);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (newPwd.length < 6) {
      setPwdError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Las contraseñas no coinciden');
      return;
    }
    setPwdLoading(true);
    // Demo: just show success
    setTimeout(() => {
      setPwdLoading(false);
      setPwdSuccess('Contraseña actualizada exitosamente');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdSuccess(''), 3000);
    }, 800);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    useAppStore.getState().logout();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const planBadge = (plan: string) => {
    switch (plan) {
      case 'vip':
        return (
          <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 px-3 py-1 text-sm">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            VIP
          </Badge>
        );
      case 'premium':
        return (
          <Badge className="bg-red-600/20 text-red-400 border-red-600/30 px-3 py-1 text-sm">
            Premium
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-700 text-gray-300 px-3 py-1 text-sm">
            Gratis
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-8 lg:px-16">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-gray-400 mb-8">Gestiona tu cuenta y preferencias</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/20 flex items-center justify-center border-2 border-red-600/30">
                <span className="text-2xl sm:text-3xl font-bold text-red-500">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{userName}</h2>
                <p className="text-gray-400 text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {userEmail}
                </p>
                <div className="mt-1.5">{planBadge(userPlan)}</div>
              </div>
            </div>

            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditName(userName);
                  setEditEmail(userEmail);
                  setIsEditing(true);
                }}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Miembro desde
              </div>
              <p className="text-white text-sm font-medium">{formatDate(userCreatedAt)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Crown className="h-3.5 w-3.5" />
                Plan actual
              </div>
              <p className="text-white text-sm font-medium capitalize">{userPlan}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Shield className="h-3.5 w-3.5" />
                Rol
              </div>
              <p className="text-white text-sm font-medium capitalize">
                {userRole === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Separator className="bg-white/10" />
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Nombre</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-red-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-red-600"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : saved ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : null}
                    {saved ? 'Guardado' : 'Guardar Cambios'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="border-white/10 text-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Subscription Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-600/10">
              <CreditCard className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Suscripción</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium capitalize">
                Plan {userPlan}
              </p>
              <p className="text-gray-400 text-sm">
                {userPlan === 'vip'
                  ? '$9.99/mes - Renovación automática'
                  : userPlan === 'premium'
                  ? '$4.99/mes - Renovación automática'
                  : 'Gratis - Sin renovación'}
              </p>
            </div>
            {userPlan !== 'vip' && (
              <Button
                onClick={() => setCurrentView('pricing')}
                className="bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                Mejorar Plan
              </Button>
            )}
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 mb-6"
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start border-white/10 text-gray-300 hover:bg-white/5 hover:text-white h-12"
              >
                <Lock className="h-4 w-4 mr-3" />
                Cambiar Contraseña
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Cambiar Contraseña</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      className="bg-white/5 border-white/10 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Nueva contraseña</Label>
                  <Input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Confirmar nueva contraseña</Label>
                  <Input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {pwdError && (
                  <p className="text-red-400 text-sm">{pwdError}</p>
                )}
                {pwdSuccess && (
                  <p className="text-green-400 text-sm">{pwdSuccess}</p>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={pwdLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {pwdLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Actualizar Contraseña
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 border-red-600/20 text-red-400 hover:bg-red-600/10 hover:text-red-300 hover:border-red-600/30 transition-all"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Cerrar Sesión
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
