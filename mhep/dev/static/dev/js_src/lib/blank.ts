import { NewAssessment } from '../types/Assessment';

export default function blank(): NewAssessment {
    const blank: NewAssessment = {
        _commentary: {
            brief: '',
            context: '',
            decisions: '',
            scenarios: {},
        },
        _report: {
            date: '',
            version: '',
        },
        master: {
            scenario_name: 'Baseline',
        },
    };
    return blank;
}
