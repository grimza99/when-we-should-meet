export const addOneMonth = (isoDate: string) => {
  const expiresAt = new Date(isoDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt.toISOString();
};

export const formatRoomRange = (startDate: string, endDate: string) => {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (startDate === endDate) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${
      end.getMonth() + 1
    }월 ${end.getDate()}일`;
  }

  return `${start.getFullYear()}년 ${
    start.getMonth() + 1
  }월 ${start.getDate()}일 - ${end.getFullYear()}년 ${
    end.getMonth() + 1
  }월 ${end.getDate()}일`;
};

function parseDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
