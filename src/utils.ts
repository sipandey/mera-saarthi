export const formatRs = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
export const defaultDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86400000));
export const todayInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
