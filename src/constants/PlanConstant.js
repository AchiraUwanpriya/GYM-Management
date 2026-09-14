export const FETCH_PLANS_REQUEST = 'FETCH_PLANS_REQUEST';
export const FETCH_PLANS_SUCCESS = 'FETCH_PLANS_SUCCESS';
export const FETCH_PLANS_FAILURE = 'FETCH_PLANS_FAILURE';


export const PLAN_TYPES = ['Silver', 'Gold', 'Platinum'];

export const PLAN_TYPE_DURATIONS = {
  Silver:   [30, 60],
  Gold:     [30, 90, 180, 365],
  Platinum: [90, 180, 270, 365],
};

export const PLAN_TYPE_MAX_TRAINERS = {
  Silver: 1,
  Gold: 1,
  Platinum: 3,
};