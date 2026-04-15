import { useMemo, useState } from 'react'
import { resolveDateRange } from '../../lib/date'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { SegmentedButtonGroup } from '../ui/SegmentedButtonGroup'
import { TextInput } from '../ui/TextInput'
import type { CreateRoomPayload, DateRangeType } from '../../types'

type CreateRoomModalProps = {
  onCreateRoom: (payload: CreateRoomPayload) => void
}

export function CreateRoomModal({ onCreateRoom }: CreateRoomModalProps) {
  const [maxParticipants, setMaxParticipants] = useState('6')
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('this_month')
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const resolvedRange = useMemo(
    () => resolveDateRange(dateRangeType, startDate, endDate),
    [dateRangeType, endDate, startDate],
  )

  const submit = () => {
    onCreateRoom({
      maxParticipants: Number(maxParticipants),
      dateRangeType,
      startDate: resolvedRange.startDate,
      endDate: resolvedRange.endDate,
    })
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

        <Button block onClick={submit}>
          방 생성하기
        </Button>
      </div>
    </Modal>
  )
}
