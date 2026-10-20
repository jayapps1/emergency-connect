-- Migration V26: Citizen response reviews linked to report assignments and public users

CREATE TABLE IF NOT EXISTS incident_response_review (
    id UUID PRIMARY KEY,
    report_id UUID NOT NULL,
    assignment_id UUID NOT NULL,
    public_user_id UUID NOT NULL,
    agency_id UUID,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    response_speed_rating SMALLINT CHECK (response_speed_rating BETWEEN 1 AND 5),
    professionalism_rating SMALLINT CHECK (professionalism_rating BETWEEN 1 AND 5),
    helpfulness_rating SMALLINT CHECK (helpfulness_rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_report FOREIGN KEY (report_id) REFERENCES incident_report(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_assignment FOREIGN KEY (assignment_id) REFERENCES report_assignment(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_user FOREIGN KEY (public_user_id) REFERENCES public_user(id) ON DELETE CASCADE,
    CONSTRAINT uq_review_assignment_user UNIQUE (assignment_id, public_user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_assignment ON incident_response_review(assignment_id);
CREATE INDEX IF NOT EXISTS idx_review_report ON incident_response_review(report_id);
CREATE INDEX IF NOT EXISTS idx_review_user ON incident_response_review(public_user_id);
CREATE INDEX IF NOT EXISTS idx_review_agency ON incident_response_review(agency_id);
