export type Tournament = {slug:string;title:string;description:string;date:string;venue:string;address:string;fee:string;time_control:string;rounds:string;rating:string;image:string|null;url:string;registration_url:string|null;entries_url:string|null;absence_url:string;club_event:boolean;vega_url:string|null};
export type Player = {title:string;name:string;gender:string;fide_id:string;fide_rating:number|null;nzcf_rating:number|null;club:string};
export type Feed = {tournaments:Tournament[];news:{title:string;url:string;summary:string;image:string|null}[];contact:{email:string;phone:string;url:string};fetched_at:string};
export type AccountData = {memberships:{id:string;first_name:string;last_name:string;membership_id:string;membership_status:string;membership_end_date:string;payment_status:string}[];payments:{payment_type:string;reference_id:string;amount_cents:number;status:string;created_at:string}[]};
export type CalendarData={title:string;items:{slug:string;title:string;date:string;year:string;status:string;details:string;description:string;club_event:boolean;url:string}[]};
export type Result={title:string;date:string;year:string;first:string;second:string;third:string;summary:string;image:string|null;links:{label:string;url:string}[]};
export type NewsDetail={title:string;date:string;image:string|null;paragraphs:string[];url:string};
export type FormReply={ok:boolean;reference:string;message:string;email_status:string};
