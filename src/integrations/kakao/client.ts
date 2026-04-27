const KAKAO_SDK_VERSION = "2.8.1";
const KAKAO_SDK_URL = `https://t1.kakaocdn.net/kakao_js_sdk/${KAKAO_SDK_VERSION}/kakao.min.js`;
const KAKAO_SCRIPT_ID = "kakao-js-sdk";

type KakaoShareLink = {
  mobileWebUrl: string;
  webUrl: string;
};

type KakaoShareButton = {
  title: string;
  link: KakaoShareLink;
};

type KakaoShareTextOptions = {
  objectType: "text";
  text: string;
  link: KakaoShareLink;
  buttonTitle?: string;
  buttons?: KakaoShareButton[];
};

type KakaoSdk = {
  Share: {
    sendDefault: (options: KakaoShareTextOptions) => void;
  };
  init: (key: string) => void;
  isInitialized: () => boolean;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const kakaoJavaScriptKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();

export const isKakaoConfigured = Boolean(kakaoJavaScriptKey);

let kakaoSdkPromise: Promise<KakaoSdk> | null = null;

export async function shareRoomWithKakao(params: {
  inviteCode: string;
  roomId: string;
}) {
  const roomUrl = new URL(
    `/room/${params.roomId}`,
    window.location.origin
  ).toString();
  const sdk = await getKakaoSdk();

  sdk.Share.sendDefault({
    objectType: "text",
    text: `친구가 일정방에 초대했어요!\n아래 링크를 통해 로그인 없이도\n쉽게 약속을 잡아봐요!`,
    link: {
      mobileWebUrl: roomUrl,
      webUrl: roomUrl,
    },
    buttons: [
      {
        title: "약속 일정 잡기",
        link: {
          mobileWebUrl: roomUrl,
          webUrl: roomUrl,
        },
      },
    ],
  });

  return roomUrl;
}

async function getKakaoSdk() {
  if (!isKakaoConfigured || !kakaoJavaScriptKey) {
    throw new Error("KAKAO_NOT_CONFIGURED");
  }

  if (window.Kakao) {
    initializeKakao(window.Kakao, kakaoJavaScriptKey);
    return window.Kakao;
  }

  if (!kakaoSdkPromise) {
    kakaoSdkPromise = loadKakaoSdk(kakaoJavaScriptKey);
  }

  return kakaoSdkPromise;
}

function initializeKakao(sdk: KakaoSdk, key: string) {
  if (!sdk.isInitialized()) {
    sdk.init(key);
  }
}

function loadKakaoSdk(key: string) {
  return new Promise<KakaoSdk>((resolve, reject) => {
    const existingScript = document.getElementById(
      KAKAO_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript && window.Kakao) {
      initializeKakao(window.Kakao, key);
      resolve(window.Kakao);
      return;
    }

    const handleLoad = () => {
      if (!window.Kakao) {
        reject(new Error("KAKAO_SDK_UNAVAILABLE"));
        return;
      }

      initializeKakao(window.Kakao, key);
      resolve(window.Kakao);
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("KAKAO_SDK_LOAD_FAILED")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("KAKAO_SDK_LOAD_FAILED")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}
