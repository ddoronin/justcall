import type { Translations } from "../types";

const ru: Translations = {
  "home.title": "JustCall",
  "home.subtitle": "Простые видеозвонки — в один тап.",
  "home.startCall": "Начать видеозвонок",
  "call.status.camera.requestingPermissions":
    "Ожидание разрешения на камеру...",
  "call.status.camera.initializing": "Инициализация камеры...",
  "call.status.camera.ready": "Камера готова",
  "call.status.webrtc.connecting": "Устанавливаем соединение звонка...",
  "call.status.webrtc.waitingParticipant": "Ожидание подключения собеседника",
  "call.status.connected": "Звонок подключён",
  "call.status.ended": "Звонок завершён",
  "call.error.default":
    "Что-то пошло не так. Обновите страницу и попробуйте снова.",
  "call.error.serverUnreachable":
    "Не удалось подключиться к серверу звонков. Обновите страницу и попробуйте снова.",
  "call.error.roomFull":
    "Этот звонок уже заполнен. Попросите новую ссылку на звонок.",
  "call.error.fallbackNetwork":
    "Используются резервные сетевые настройки. Если звонок не работает, проверьте переменные ICE/TURN.",
  "call.error.unstableConnection":
    "Соединение нестабильно. Ожидаем восстановление звонка...",
  "call.error.connectionLost":
    "Соединение потеряно. Ваша сеть может блокировать прямые звонки. Обновите страницу и попробуйте снова.",
  "call.error.media.notAllowed":
    "Доступ к камере/микрофону запрещён. Разрешите доступ в настройках браузера и нажмите «Включить видео».",
  "call.error.media.notFound": "Камера на устройстве не найдена.",
  "call.error.media.notReadable":
    "Камера занята другим приложением. Закройте его и попробуйте снова.",
  "call.error.media.security":
    "Камера заблокирована настройками безопасности браузера.",
  "call.error.media.startFailed":
    "Не удалось запустить камеру/микрофон. Нажмите «Включить видео», чтобы попробовать снова.",
  "call.error.media.unsupportedBrowser":
    "Этот браузер не поддерживает доступ к камере.",
  "call.share.inviteCopied": "Ссылка-приглашение скопирована.",
  "call.share.copyFailed":
    "Не удалось скопировать ссылку. Скопируйте её вручную.",
  "call.share.opened": "Окно отправки открыто.",
  "call.share.title": "Присоединяйся к моему звонку в JustCall",
  "call.share.text": "Присоединяйся к моему видеозвонку",
  "call.invite.shareAria": "Поделиться ссылкой-приглашением",
  "call.invite.shareCta": "Поделиться приглашением",
  "call.invite.copyAria": "Скопировать ссылку-приглашение",
  "call.view.fitAria": "По размеру экрана",
  "call.view.fillAria": "На весь экран",
  "call.view.fitLabel": "",
  "call.view.fillLabel": "",
  "call.controls.videoOnAria": "Включить камеру",
  "call.controls.videoOffAria": "Выключить камеру",
  "call.controls.videoOnLabel": "Видео вкл",
  "call.controls.videoOffLabel": "Видео выкл",
  "call.controls.unmuteAria": "Включить микрофон",
  "call.controls.muteAria": "Выключить микрофон",
  "call.controls.unmuteLabel": "Вкл. звук",
  "call.controls.muteLabel": "Выкл. звук",
  "call.controls.flipAria": "Переключить камеру",
  "call.controls.flippingLabel": "Переключаем...",
  "call.controls.flipLabel": "Камера",
  "call.controls.endAria": "Завершить звонок",
  "call.controls.endLabel": "Завершить",
  "call.selfView.expandAria": "Развернуть свое видео",
  "call.selfView.collapseAria": "Свернуть свое видео",
  "call.selfView.hideAria": "Скрыть свое видео",
  "call.selfView.showAria": "Показать свое видео",
  "call.completed.message": "Видеозвонок завершён.",
  "call.completed.durationLabel": "Длительность звонка",
  "call.completed.goHome": "На главную",
};

export default ru;
