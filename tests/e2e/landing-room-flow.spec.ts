import { expect, test } from "@playwright/test";
import { ARIA_LABELS } from "../../src/lib/ariaLabels";

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`;
}

test.describe("랜딩페이지", () => {
  test("랜딩페이지 렌더, 방만들기", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(byAriaLabel(ARIA_LABELS.landing.page))).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.landing.heading))
    ).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton))
    ).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.landing.inviteCodeInput))
    ).toBeVisible();
    await expect(page.getByText("1초만에 시작")).toBeVisible();
    await expect(page.getByText("손쉬운 터치")).toBeVisible();
    await expect(page.getByText("최적의 날짜 추천")).toBeVisible();

    await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click();

    const createDialog = page.locator(byAriaLabel(ARIA_LABELS.createRoom.dialog));
    await expect(createDialog).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.createRoom.participantCountInput))
    ).toHaveValue("6");
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.createRoom.thisMonthRangeButton))
    ).toHaveAttribute("aria-pressed", "true");

    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.participantCountInput))
      .fill("1");
    await expect(
      page.getByText("최대 인원은 2명부터 10명까지 설정할 수 있습니다.")
    ).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton))
    ).toBeDisabled();

    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.participantCountInput))
      .fill("6");
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.customRangeButton))
      .click();
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.startDateInput))
      .fill("2026-05-20");
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.endDateInput))
      .fill("2026-05-10");
    await expect(
      page.getByText(
        "직접 지정 날짜 범위는 시작일이 종료일보다 늦을 수 없습니다."
      )
    ).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton))
    ).toBeDisabled();
  });

  test("creates a room, joins with a nickname, and rejects an invalid invite code", async ({
    page,
  }) => {
    await page.goto("/");

    const inviteCodeInput = page.locator(
      byAriaLabel(ARIA_LABELS.landing.inviteCodeInput)
    );
    await inviteCodeInput.fill("ab 12c");
    await expect(inviteCodeInput).toHaveValue("AB12C");
    await inviteCodeInput.fill("abc1234");
    await expect(inviteCodeInput).toHaveValue("ABC123");

    await page.locator(byAriaLabel(ARIA_LABELS.landing.joinRoomButton)).click();
    await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText(
      "일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요."
    );
    await expect(page).toHaveURL("http://127.0.0.1:4173/");

    await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click();
    await page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton)).click();

    await expect(page).toHaveURL(/\/room\/[^/]+$/);
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading))
    ).toHaveText(/^[A-Z0-9]{6}$/);
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))
    ).toBeVisible();

    const joinButton = page.locator(
      byAriaLabel(ARIA_LABELS.nickname.submitButton)
    );
    await expect(joinButton).toBeDisabled();

    await page.locator(byAriaLabel(ARIA_LABELS.nickname.input)).fill("민준");
    await joinButton.click();

    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))
    ).toBeHidden();
    await expect(page.getByText("민준", { exact: true })).toBeVisible();
    await expect(page.getByText("1 / 6명 참여 중")).toBeVisible();
    await expect(
      page.getByText(
        "아직 모인 날짜 선택이 없어요. 먼저 참가자들이 닉네임을 입력하고 달력에서 가능한 날짜를 골라보세요"
      )
    ).toBeVisible();
    await expect(
      page.locator(byAriaLabel(ARIA_LABELS.room.calendarCard))
    ).toBeVisible();
  });
});
