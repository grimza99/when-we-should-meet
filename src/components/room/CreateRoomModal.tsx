import { useMemo, useState } from 'react'
import { resolveDateRange } from '../../lib/date'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { SegmentedButtonGroup } from '../ui/SegmentedButtonGroup'
import { TextInput } from '../ui/TextInput'
import type { CreateRoomPayload, DateRangeType } from '../../types'

type CreateRoomModalProps = {
  onCreateRoom: (payload: CreateRoomPayload) => Promise<boolean>
}

export function CreateRoomModal({ onCreateRoom }: CreateRoomModalProps) {
  const [maxParticipants, setMaxParticipants] = useState('6')
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('this_month')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const participantCount = Number(maxParticipants)

  const resolvedRange = useMemo(
    () => resolveDateRange(dateRangeType, startDate, endDate),
    [dateRangeType, endDate, startDate],
  )

  const participantValidationMessage = useMemo(() => {
    if (!Number.isInteger(participantCount)) {
      return '최대 인원은 숫자로 입력해 주세요.'
    }

    if (participantCount < 2 || participantCount > 10) {
      return '최대 인원은 2명부터 10명까지 설정할 수 있습니다.'
    }

    return null
  }, [participantCount])

  const rangeValidationMessage = useMemo(() => {
    if (dateRangeType !== 'custom') {
      return null
    }

    if (!startDate || !endDate) {
      return '직접 지정에서는 시작일과 종료일을 모두 입력해야 합니다.'
    }

    if (startDate > endDate) {
      return '직접 지정 날짜 범위는 시작일이 종료일보다 늦을 수 없습니다.'
    }

    return null
  }, [dateRangeType, endDate, startDate])

  const validationMessage = participantValidationMessage ?? rangeValidationMessage
  const canSubmit = validationMessage === null && !isSubmitting

  const submit = async () => {
    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)

    try {
      await onCreateRoom({
        maxParticipants: participantCount,
        dateRangeType,
        startDate: resolvedRange.startDate,
        endDate: resolvedRange.endDate,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      description="최대 인원과 날짜 범위를 먼저 정한 뒤 바로 방으로 이동합니다."
      title="방 만들기"
    >
      <div className="modal-body">
        <TextInput
          label="최대 인원"
          max={10}
          min={2}
          onChange={setMaxParticipants}
          type="number"
          value={maxParticipants}
        />

        <div className="field">
          <p className="label">날짜 범위</p>
          <SegmentedButtonGroup
            onChange={setDateRangeType}
            options={[
              { label: '이번 달', value: 'this_month' },
              { label: '이번 년', value: 'this_year' },
              { label: '직접 지정', value: 'custom' },
            ]}
            selectedValue={dateRangeType}
          />
        </div>

        {dateRangeType === 'custom' ? (
          <div className="date-grid">
            <TextInput
              label="시작일"
              onChange={setStartDate}
              type="date"
              value={startDate}
            />
            <TextInput
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
            <span>선택 범위</span>
            <span>
              {resolvedRange.startDate} ~ {resolvedRange.endDate}
            </span>
          </p>
        )}

        <Button block disabled={!canSubmit} onClick={() => void submit()}>
          {isSubmitting ? '방 생성 중...' : '방 생성하기'}
        </Button>
      </div>
    </Modal>
  )
}
