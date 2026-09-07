<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'
import { isPasswordValid } from '~/utils/password-strength'
import { willActivateDomainSeparation } from '~/utils/domain-separation'

const route = useRoute()
const router = useRouter()
const { setup, migrate, fetchStatus } = useAuth()
const toast = useToast()
const { t, locale } = useI18n()

const domainSeparationDocUrl = computed(() =>
  locale.value === 'en'
    ? 'https://o96u.github.io/PicHost/en/guide/domain-separation'
    : 'https://o96u.github.io/PicHost/guide/domain-separation'
)

const needsMigration = ref(false)
const isMigrate = computed(() => needsMigration.value || route.query.migrate === '1')

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const allowRegistration = ref(false)
const domainSeparation = ref(false)
const siteBaseUrl = ref('')
const imageBaseUrl = ref('')
const loading = ref(false)
const domainSeparationConfirmOpen = ref(false)

const setupMode = ref<'init' | 'restore'>('init')
const restoreFile = ref<File | null>(null)
const restoreFileInput = ref<HTMLInputElement | null>(null)
const restoreLoading = ref(false)
const restoreJobId = ref<string | null>(null)
const restoreProgress = ref({ progress: 0, total: 0, message: '' })
let restorePollTimer: ReturnType<typeof setInterval> | null = null

function stopRestorePolling() {
  if (restorePollTimer) {
    clearInterval(restorePollTimer)
    restorePollTimer = null
  }
}

function pickRestoreFile() {
  restoreFileInput.value?.click()
}

function onRestoreFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  restoreFile.value = input.files?.[0] ?? null
  if (input) input.value = ''
}

async function pollRestoreJob(jobId: string) {
  try {
    const data = await $fetch<{ job: { status: string, progress: number, total: number, message: string, error: string | null } }>(
      `/api/setup/restore/${jobId}`
    )
    restoreProgress.value = {
      progress: data.job.progress,
      total: data.job.total,
      message: data.job.message
    }
    if (data.job.status === 'done') {
      stopRestorePolling()
      restoreLoading.value = false
      toast.add({
        title: t('setup.restoreSuccess'),
        description: t('setup.restoreSecretsHint'),
        color: 'success'
      })
      await router.replace('/')
      return
    }
    if (data.job.status === 'failed') {
      stopRestorePolling()
      restoreLoading.value = false
      toast.add({
        title: t('setup.restoreFailed'),
        description: data.job.error ?? data.job.message,
        color: 'error'
      })
    }
  } catch {
    stopRestorePolling()
    restoreLoading.value = false
    toast.add({ title: t('setup.restoreFailed'), color: 'error' })
  }
}

async function submitRestore() {
  if (!restoreFile.value || restoreLoading.value) return
  restoreLoading.value = true
  try {
    const form = new FormData()
    form.append('file', restoreFile.value)
    const data = await $fetch<{ job: { id: string } }>('/api/setup/restore', {
      method: 'POST',
      body: form
    })
    restoreJobId.value = data.job.id
    restorePollTimer = setInterval(() => {
      void pollRestoreJob(data.job.id)
    }, 1500)
    await pollRestoreJob(data.job.id)
  } catch {
    restoreLoading.value = false
    toast.add({ title: t('setup.restoreFailed'), color: 'error' })
  }
}

onUnmounted(() => {
  stopRestorePolling()
})

const domainSeparationWouldActivate = computed(() =>
  willActivateDomainSeparation(
    domainSeparation.value,
    siteBaseUrl.value,
    imageBaseUrl.value
  )
)

const canSubmit = computed(() => {
  if (!username.value || !password.value || !confirmPassword.value) return false
  if (password.value !== confirmPassword.value) return false
  if (!isPasswordValid(password.value)) return false
  if (!AUTH_USERNAME_PATTERN.test(username.value.trim())) return false
  if (domainSeparation.value) {
    if (!siteBaseUrl.value.trim() || !imageBaseUrl.value.trim()) return false
  }
  return true
})

onMounted(async () => {
  const status = await fetchStatus()
  needsMigration.value = status.needsMigration
  if (status.legacyMode && !status.needsMigration) {
    await router.replace('/')
    return
  }
  if (status.initialized && !status.needsMigration) {
    await router.replace('/')
    return
  }
})

const detectedOriginPlaceholder = computed(() =>
  import.meta.client ? window.location.origin : ''
)

async function submit() {
  if (!canSubmit.value || loading.value) return

  if (password.value !== confirmPassword.value) {
    toast.add({ title: t('auth.passwordMismatch'), color: 'error' })
    return
  }

  if (domainSeparationWouldActivate.value) {
    domainSeparationConfirmOpen.value = true
    return
  }

  await performSubmit()
}

async function performSubmit() {
  domainSeparationConfirmOpen.value = false
  if (!canSubmit.value || loading.value) return

  loading.value = true
  try {
    const payload = {
      username: username.value.trim(),
      password: password.value,
      allowRegistration: allowRegistration.value,
      domainSeparation: domainSeparation.value,
      siteBaseUrl: domainSeparation.value ? siteBaseUrl.value.trim() : undefined,
      imageBaseUrl: domainSeparation.value ? imageBaseUrl.value.trim() : undefined
    }
    const result = isMigrate.value
      ? await migrate(payload)
      : await setup(payload)

    if (result.ok) {
      toast.add({
        title: isMigrate.value ? t('setup.migrateSuccess') : t('setup.initSuccess'),
        color: 'success'
      })
      await router.replace('/')
    } else {
      toast.add({ title: result.error, color: 'error' })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
    <div class="absolute top-4 right-4">
      <AuthPagePreferences />
    </div>
    <div class="w-full max-w-sm rounded-2xl border border-default bg-elevated p-6 shadow-lg sm:max-w-md sm:p-8">
      <div class="mb-8 space-y-3 text-center">
        <div class="mx-auto inline-flex items-center justify-center">
          <img
            :src="logoLight"
            alt=""
            aria-hidden="true"
            class="h-14 w-auto shrink-0 object-contain dark:hidden sm:h-16"
            decoding="async"
            draggable="false"
          >
          <img
            :src="logoDark"
            alt=""
            aria-hidden="true"
            class="hidden h-14 w-auto shrink-0 object-contain dark:block sm:h-16"
            decoding="async"
            draggable="false"
          >
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-bold tracking-tight sm:text-2xl">
            <span class="text-highlighted">Pic</span><span class="text-primary">Host</span>
          </h1>
          <p class="text-sm text-muted">
            {{ isMigrate ? t('setup.migrateTitle') : t('setup.initTitle') }}
          </p>
        </div>
      </div>

      <div class="mb-6 flex rounded-lg border border-default p-1">
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="setupMode === 'init' ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
          @click="setupMode = 'init'"
        >
          {{ t('setup.modeInit') }}
        </button>
        <button
          v-if="!isMigrate"
          type="button"
          class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="setupMode === 'restore' ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
          @click="setupMode = 'restore'"
        >
          {{ t('setup.modeRestore') }}
        </button>
      </div>

      <form
        v-if="setupMode === 'init'"
        class="flex w-full flex-col gap-5"
        @submit.prevent="submit"
      >
        <div class="w-full space-y-2">
          <label
            for="setup-username"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.username') }}
          </label>
          <UInput
            id="setup-username"
            v-model="username"
            :placeholder="t('setup.usernamePlaceholder')"
            autocomplete="username"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
        </div>

        <div class="w-full space-y-2">
          <label
            for="setup-password"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.password') }}
          </label>
          <PasswordInput
            id="setup-password"
            v-model="password"
            :placeholder="t('setup.passwordPlaceholder')"
            autocomplete="new-password"
          />
          <PasswordStrength :password="password" />
        </div>

        <div class="w-full space-y-2">
          <label
            for="setup-confirm"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.confirmPassword') }}
          </label>
          <PasswordInput
            id="setup-confirm"
            v-model="confirmPassword"
            :placeholder="t('setup.confirmPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-sm text-default">
          <UCheckbox v-model="allowRegistration" />
          {{ t('setup.allowRegistration') }}
        </label>

        <div class="space-y-3 rounded-xl border border-default bg-muted/20 p-4">
          <label class="flex cursor-pointer items-start gap-2.5">
            <UCheckbox
              v-model="domainSeparation"
              class="mt-0.5"
            />
            <span>
              <span class="block text-sm font-medium">{{ t('setup.domainSeparation') }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-muted">
                {{ t('setup.domainSeparationHint') }}
              </span>
            </span>
          </label>

          <template v-if="domainSeparation">
            <p class="text-xs leading-relaxed text-warning">
              {{ t('setup.domainSeparationProxyHint') }}
              <a
                :href="domainSeparationDocUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                {{ t('setup.domainSeparationProxyExample') }}
              </a>
            </p>
            <div class="space-y-2">
              <label class="text-sm">{{ t('setup.siteBaseUrl') }}</label>
              <p class="text-xs text-muted">
                {{ t('setup.siteBaseUrlHint') }}
              </p>
              <UInput
                v-model="siteBaseUrl"
                :placeholder="detectedOriginPlaceholder || t('setup.siteBaseUrlPlaceholder')"
                class="w-full font-mono text-sm"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm">{{ t('setup.imageBaseUrl') }}</label>
              <p class="text-xs text-muted">
                {{ t('setup.imageBaseUrlHint') }}
              </p>
              <UInput
                v-model="imageBaseUrl"
                :placeholder="t('setup.imageBaseUrlPlaceholder')"
                class="w-full font-mono text-sm"
              />
            </div>
          </template>
        </div>

        <UButton
          type="submit"
          :label="isMigrate ? t('setup.migrateSubmit') : t('setup.initSubmit')"
          icon="i-lucide-user-plus"
          size="lg"
          block
          class="w-full"
          :loading="loading"
          :disabled="!canSubmit"
        />
      </form>

      <div
        v-else
        class="flex w-full flex-col gap-5"
      >
        <div class="space-y-1.5">
          <label class="text-xs text-muted">{{ t('storage.backup.restoreUploadLabel') }}</label>
          <button
            type="button"
            class="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            :class="restoreFile
              ? 'border-primary/50 bg-primary/5'
              : 'border-warning/40 bg-warning/5 hover:border-warning/60 hover:bg-warning/10'"
            :disabled="restoreLoading"
            @click="pickRestoreFile"
          >
            <div
              class="flex size-8 items-center justify-center rounded-full"
              :class="restoreFile ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'"
            >
              <UIcon
                :name="restoreFile ? 'i-lucide-check' : 'i-lucide-upload'"
                class="size-4.5"
              />
            </div>
            <span class="max-w-full truncate text-sm font-medium text-default">
              {{ restoreFile?.name ?? t('storage.backup.restoreUpload') }}
            </span>
            <span
              v-if="!restoreFile"
              class="text-xs text-muted"
            >
              {{ t('storage.backup.restoreUploadHint') }}
            </span>
          </button>
        </div>

        <div class="rounded-lg bg-muted/15 px-3 py-2.5 text-xs leading-relaxed text-muted">
          {{ t('setup.restoreHint') }}
        </div>

        <StorageBackupJobProgress
          v-if="restoreLoading"
          :message="restoreProgress.message || t('setup.restoreSubmit')"
          :progress="restoreProgress.progress"
          :total="restoreProgress.total"
        />

        <UButton
          :label="t('setup.restoreSubmit')"
          icon="i-lucide-upload"
          size="lg"
          block
          class="w-full"
          :loading="restoreLoading"
          :disabled="!restoreFile"
          @click="submitRestore"
        />

        <input
          ref="restoreFileInput"
          type="file"
          accept=".phost.tar.gz,.tar.gz"
          class="hidden"
          @change="onRestoreFileChange"
        >
      </div>
    </div>

    <UModal
      :open="domainSeparationConfirmOpen"
      :title="t('domainSeparationConfirm.title')"
      :description="t('domainSeparationConfirm.description')"
      @update:open="(v) => { if (!v) domainSeparationConfirmOpen = false }"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="() => { domainSeparationConfirmOpen = false }"
          />
          <UButton
            :label="t('domainSeparationConfirm.confirm')"
            color="warning"
            :loading="loading"
            @click="performSubmit"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
