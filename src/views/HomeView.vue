<template>
  <div class="home">
    <AppNavigation />

    <PageHeader
      title="Home Dashboard"
      description="Welcome to Ulinda. Select an option below to get started."
    />

    <div class="content">
      <!-- Main Navigation Section -->
      <section class="nav-section">
        <h2 class="section-title">Main</h2>
        <div class="nav-cards">
          <div class="nav-card" @click="navigateTo('/models')">
            <div class="card-icon">📋</div>
            <h3 class="card-title">Models</h3>
            <p class="card-description">View and manage your data models</p>
          </div>
        </div>
      </section>

      <!-- Account Section -->
      <section class="nav-section">
        <h2 class="section-title">Account</h2>
        <div class="nav-cards">
          <div class="nav-card" @click="navigateTo('/account/change-password')">
            <div class="card-icon">🔑</div>
            <h3 class="card-title">Change Password</h3>
            <p class="card-description">Update your account password</p>
          </div>

          <div v-if="canAccessTokens" class="nav-card" @click="navigateTo('/account/tokens')">
            <div class="card-icon">🔐</div>
            <h3 class="card-title">Tokens</h3>
            <p class="card-description">Manage your API tokens</p>
          </div>
        </div>
      </section>

      <!-- Admin Section (only for admins) -->
      <section v-if="isUserAdmin" class="nav-section admin-section">
        <h2 class="section-title">Admin</h2>
        <div class="nav-cards">
          <div class="nav-card admin-card" @click="navigateTo('/admin/users')">
            <div class="card-icon">👥</div>
            <h3 class="card-title">User Administration</h3>
            <p class="card-description">Manage users and permissions</p>
          </div>

          <div class="nav-card admin-card" @click="navigateTo('/admin/models')">
            <div class="card-icon">⚙️</div>
            <h3 class="card-title">Model Administration</h3>
            <p class="card-description">Configure data models</p>
          </div>

          <div class="nav-card admin-card" @click="navigateTo('/admin/error-logs')">
            <div class="card-icon">🔴</div>
            <h3 class="card-title">Error Logs</h3>
            <p class="card-description">View application errors</p>
          </div>

          <div class="nav-card admin-card" @click="navigateTo('/admin/security-settings')">
            <div class="card-icon">🛡️</div>
            <h3 class="card-title">Security Settings</h3>
            <p class="card-description">Configure security options</p>
          </div>

          <div class="nav-card admin-card" @click="navigateTo('/admin/tokens')">
            <div class="card-icon">🎫</div>
            <h3 class="card-title">Token Management</h3>
            <p class="card-description">View all user tokens</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavigation from '@/components/AppNavigation.vue'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
const authStore = useAuthStore()

const isUserAdmin = computed(() => {
  return authStore.isAdminUser()
})

const canAccessTokens = computed(() => {
  return authStore.canGenerateTokens() || authStore.isAdminUser()
})

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.home {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
}

.content {
  padding-top: calc(195px + 2rem);
  padding-left: 2rem;
  padding-right: 2rem;
  padding-bottom: 2rem;
  width: 100%;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.nav-section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.admin-section .section-title {
  color: #6f42c1;
  border-bottom-color: #6f42c1;
}

.nav-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.nav-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #e9ecef;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 200px;
}

.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #007bff;
}

.admin-card {
  border-color: #e9d5f5;
}

.admin-card:hover {
  border-color: #6f42c1;
  box-shadow: 0 4px 16px rgba(111, 66, 193, 0.2);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  line-height: 1;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
}

.admin-card .card-title {
  color: #6f42c1;
}

.card-description {
  font-size: 0.95rem;
  color: #6c757d;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .nav-cards {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .content {
    padding-top: calc(195px + 1rem);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
  }

  .nav-cards {
    grid-template-columns: 1fr;
  }

  .nav-card {
    padding: 1.5rem;
    min-height: 160px;
  }

  .card-icon {
    font-size: 2.5rem;
  }

  .card-title {
    font-size: 1.1rem;
  }

  .card-description {
    font-size: 0.9rem;
  }
}
</style>