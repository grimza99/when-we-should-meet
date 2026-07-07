import { useMemo, useState } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { getTodayDateString, resolveDateRange } from "../../lib/date";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { SegmentedButtonGroup } from "../ui/SegmentedButtonGroup";
import { TextInput } from "../ui/TextInput";
import type { AppStorage, CreateRoomPayload, DateRangeType } from "../../types";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { getOrCreateClientKey } from "../../lib/session/clientIdentity";
import { createRoomRecord } from "../../util/room";
import { useRouteState } from "../../lib/router";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { DEFAULT_STORAGE, STORAGE_KEY } from "../../lib/constants";
import { mapRoomRowToDraftRoom } from "../../integrations/firebase/mapper";
import { createRoom as createFirebaseRoom } from "../../integrations/firebase/services/room-service";
import { useToast } from "../shell/toast/toast-context";
interface ICreateRoomModalProps {
  onClose: () => void;
  setVisibleMonth: (date: string) => void;
}

export function CreateRoomModal({
  onClose,
  setVisibleMonth,
}: ICreateRoomModalProps) {
  const [maxParticipants, setMaxParticipants] = useState("6");
  const [dateRangeType, setDateRangeType] =
    useState<DateRangeType>("this_month");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = getTodayDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { navigate } = useRouteState();
  const [_, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );
  const { showToast } = useToast();
  const participantCount = Number(maxParticipants);

  const resolvedRange = useMemo(
    () => resolveDateRange(dateRangeType, startDate, endDate),
    [dateRangeType, endDate, startDate]
  );

  const participantValidationMessage = useMemo(() => {
    if (!Number.isInteger(participantCount)) {
      return "최대 인원은 숫자로 입력해 주세요.";
    }

    if (participantCount < 2 || participantCount > 10) {
      return "최대 인원은 2명부터 10명까지 설정할 수 있습니다.";
    }

    return null;
  }, [participantCount]);

  const rangeValidationMessage = useMemo(() => {
    if (dateRangeType !== "custom") {
      return null;
    }

    if (!startDate || !endDate) {
      return "직접 지정에서는 시작일과 종료일을 모두 입력해야 합니다.";
    }

    if (startDate > endDate) {
      return "직접 지정 날짜 범위는 시작일이 종료일보다 늦을 수 없습니다.";
    }

    return null;
  }, [dateRangeType, endDate, startDate]);

  const validationMessage =
    participantValidationMessage ?? rangeValidationMessage;
  const canSubmit = validationMessage === null && !isSubmitting;

  const createRoom = async (payload: CreateRoomPayload) => {
    const hostClientKey = getOrCreateClientKey();

    if (!isFirebaseConfigured) {
      const room = createRoomRecord(payload, hostClientKey);

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }));

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });
      return true;
    }

    try {
      const roomRow = await createFirebaseRoom({
        ...payload,
        hostClientKey,
      });
      const room = mapRoomRowToDraftRoom(roomRow);

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }));

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });

      return true;
    } catch {
      return false;
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const didCreateRoom = await createRoom({
        maxParticipants: participantCount,
        dateRangeType,
        startDate: resolvedRange.startDate,
        endDate: resolvedRange.endDate,
      });

      if (!didCreateRoom) {
        showToast({ msg: "방 생성에 실패했어요. 잠시 후 다시 시도해 주세요." });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      ariaLabel={ARIA_LABELS.createRoom.dialog}
      onClose={onClose}
      title="일정 만들기"
    >
      <div className="modal-body">
        <TextInput
          ariaLabel={ARIA_LABELS.createRoom.participantCountInput}
          label="참여 인원"
          max={10}
          min={2}
          onChange={setMaxParticipants}
          type="number"
          value={maxParticipants}
        />

        <div className="field">
          <p className="label">날짜 범위</p>
          <SegmentedButtonGroup
            onChange={(rangeType) => setDateRangeType(rangeType)}
            options={[
              {
                ariaLabel: ARIA_LABELS.createRoom.thisMonthRangeButton,
                label: "이번 달",
                value: "this_month",
              },
              {
                ariaLabel: ARIA_LABELS.createRoom.thisYearRangeButton,
                label: "이번 년",
                value: "this_year",
              },
              {
                ariaLabel: ARIA_LABELS.createRoom.customRangeButton,
                label: "직접 지정",
                value: "custom",
              },
            ]}
            selectedValue={dateRangeType}
          />
        </div>

        {dateRangeType === "custom" ? (
          <div className="date-grid">
            <TextInput
              ariaLabel={ARIA_LABELS.createRoom.startDateInput}
              label="시작일"
              onChange={setStartDate}
              type="date"
              value={startDate}
            />
            <TextInput
              ariaLabel={ARIA_LABELS.createRoom.endDateInput}
              label="종료일"
              onChange={setEndDate}
              type="date"
              value={endDate}
            />
          </div>
        ) : (
          <div className="range-preview">
            <span>{resolvedRange.startDate}</span>
            <span>{resolvedRange.endDate}</span>
          </div>
        )}

        {validationMessage ? (
          <p className="modal-validation">{validationMessage}</p>
        ) : (
          <p className="range-preview">
            {maxParticipants}명과 함께, {resolvedRange.endDate}일까지 조율할게요
          </p>
        )}

        <Button
          ariaLabel={ARIA_LABELS.createRoom.submitButton}
          block
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          {isSubmitting ? "방 생성 중..." : "방 생성하기"}
        </Button>
      </div>
    </Modal>
  );
}
