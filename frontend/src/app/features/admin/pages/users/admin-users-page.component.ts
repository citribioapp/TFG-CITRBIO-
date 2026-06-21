import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminUserSummary } from '../../../../core/models/user.models';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminConfirmModalComponent } from '../../../../shared/components/admin-confirm-modal/admin-confirm-modal.component';

@Component({
  standalone: true,
  imports: [RouterLink, AdminConfirmModalComponent],
  templateUrl: './admin-users-page.component.html',
})
export class AdminUsersPageComponent {
  private readonly adminUserService = inject(AdminUserService);
  private readonly authState = inject(AuthStateService);

  protected readonly currentUser = this.authState.currentUser;
  protected readonly users = signal<AdminUserSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly savingUserId = signal<number | null>(null);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly userPendingDeletion = signal<AdminUserSummary | null>(null);
  protected readonly userPendingRoleChange = signal<AdminUserSummary | null>(null);

  constructor() {
    this.loadUsers();
  }

  protected isAdmin(user: AdminUserSummary): boolean {
    return user.roles.includes('ROLE_ADMIN');
  }

  protected isCurrentUser(user: AdminUserSummary): boolean {
    return this.currentUser()?.id === user.id;
  }

  protected getRoleLabel(user: AdminUserSummary): string {
    return this.isAdmin(user) ? 'Administrador' : 'Usuario';
  }

  protected requestRoleChange(user: AdminUserSummary): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.userPendingRoleChange.set(user);
  }

  protected cancelRoleChange(): void {
    this.userPendingRoleChange.set(null);
  }

  protected confirmRoleChange(): void {
    const user = this.userPendingRoleChange();
    if (!user) return;

    const nextRoles = this.isAdmin(user) ? ['ROLE_USER'] : ['ROLE_ADMIN'];
    this.savingUserId.set(user.id);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminUserService.updateRoles(user.id, { roles: nextRoles }).subscribe({
      next: (response) => {
        this.users.update((users) =>
          users.map((item) => (item.id === user.id ? { ...item, roles: response.roles } : item)),
        );
        this.successMessage.set('Rol actualizado correctamente.');
        this.savingUserId.set(null);
        this.userPendingRoleChange.set(null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error || 'No se pudo actualizar el rol del usuario.');
        this.savingUserId.set(null);
        this.userPendingRoleChange.set(null);
      },
    });
  }

  protected requestDeleteUser(user: AdminUserSummary): void {
    if (this.isCurrentUser(user)) {
      this.errorMessage.set('No puedes eliminar tu propio usuario desde esta pantalla.');
      return;
    }
    this.successMessage.set('');
    this.errorMessage.set('');
    this.userPendingDeletion.set(user);
  }

  protected cancelDeleteUser(): void {
    this.userPendingDeletion.set(null);
  }

  protected confirmDeleteUser(): void {
    const user = this.userPendingDeletion();
    if (!user) return;

    this.savingUserId.set(user.id);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminUserService.delete(user.id).subscribe({
      next: () => {
        this.users.update((users) => users.filter((item) => item.id !== user.id));
        this.successMessage.set('Usuario eliminado correctamente.');
        this.userPendingDeletion.set(null);
        this.savingUserId.set(null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error || 'No se pudo eliminar el usuario.');
        this.savingUserId.set(null);
      },
    });
  }

  private loadUsers(): void {
    this.adminUserService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      },
    });
  }
}
