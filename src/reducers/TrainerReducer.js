import { FETCH_TRAINERS_REQUEST, FETCH_TRAINERS_SUCCESS, FETCH_TRAINERS_FAILURE } from '../constants/TrainerConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeTrainer = (row = {}) => ({
  ...row,
  trainerId: pick(row, 'trainerId', 'TrainerId', 'trainer_id', 'Trainer_Id', 'p_trainer_id'),
  userId: pick(row, 'userId', 'UserId', 'user_id', 'User_Id', 'p_user_id'),
  firstName: pick(row, 'firstName', 'FirstName', 'first_name', 'p_first_name'),
  lastName: pick(row, 'lastName', 'LastName', 'last_name', 'p_last_name'),
  username: pick(row, 'username', 'Username', 'userName', 'trainerName', 'TrainerName'),
  email: pick(row, 'email', 'Email', 'p_email'),
  phone: pick(row, 'phone', 'Phone', 'p_phone'),
  gender: pick(row, 'gender', 'Gender', 'p_gender'),
  profile_image: pick(row, 'profile_image', 'profileImage', 'imagePath', 'ImagePath', 'p_image_path'),
  experience_years: pick(row, 'experience_years', 'experienceYears', 'ExperienceYears', 'p_experience_years'),
  bio: pick(row, 'bio', 'Bio', 'p_bio'),
  qualifications: pick(row, 'qualifications', 'Qualifications', 'p_qualifications'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
  starttime: pick(row, 'starttime', 'startTime', 'StartTime', 'p_starttime'),
  endtime: pick(row, 'endtime', 'endTime', 'EndTime', 'p_endtime'),
});

export default function TrainerReducer(state = init, action) {
  switch (action.type) {
    case FETCH_TRAINERS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_TRAINERS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeTrainer) : [] };
    case FETCH_TRAINERS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
