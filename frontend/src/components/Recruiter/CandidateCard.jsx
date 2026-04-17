import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

export default function CandidateCard({
  candidate,
  application,
  job,
  blindMode = false,
  onShortlist,
  onSchedule,
  onReveal,
}) {
  // Prepare data for Radar Chart
  const radarData = [];
  if (job?.requiredSkills && candidate?.profile?.skills) {
    radarData.push({
      subject: 'Skills Match',
      A: job.requiredSkills.length > 0
        ? (candidate.profile.skills.filter(s => job.requiredSkills.includes(s)).length / job.requiredSkills.length) * 100
        : 0,
      B: 100, // Benchmark
    });

    radarData.push({
      subject: 'Experience',
      A: application?.scoreBreakdown?.experience || 0,
      B: 100,
    });

    radarData.push({
      subject: 'Education',
      A: application?.scoreBreakdown?.education || 0,
      B: 100,
    });

    radarData.push({
      subject: 'Overall Fit',
      A: application?.matchScore || 0,
      B: 100,
    });
  }

  return (
    <div className="card slide-up" style={{ padding: 20 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
            {(candidate.profile?.firstName?.[0] || '') + (candidate.profile?.lastName?.[0] || '')}
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 0 }}>
              {candidate.profile?.firstName} {candidate.profile?.lastName}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
              {candidate.email}
            </p>
          </div>
        </div>
        {application && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 28, fontWeight: 800,
              color: application.matchScore >= 70 ? 'var(--color-success)' :
                     application.matchScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)',
            }}>
              {application.matchScore}%
            </div>
            <span className={`badge ${
              application.status === 'hired' ? 'badge-success' :
              application.status === 'rejected' ? 'badge-error' :
              application.status === 'interview' ? 'badge-info' :
              'badge-neutral'
            }`}>
              {application.status}
            </span>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginTop: 24, gap: 24 }}>
        {/* Left Side: Skills & Profile */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-secondary)' }}>
            TOP SKILLS
          </h4>
          {candidate.profile?.skills?.length > 0 && (
            <div className="tag-list" style={{ marginBottom: 24 }}>
              {candidate.profile.skills.slice(0, 10).map((skill) => (
                <span key={skill} className="tag">{skill}</span>
              ))}
              {candidate.profile.skills.length > 10 && (
                <span className="tag">+{candidate.profile.skills.length - 10}</span>
              )}
            </div>
          )}

          {application?.scoreBreakdown && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                <span>Skills Score</span>
                <span className="badge badge-primary">{application.scoreBreakdown.skills}%</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                <span>Experience Score</span>
                <span className="badge badge-primary">{application.scoreBreakdown.experience}%</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                <span>Education Score</span>
                <span className="badge badge-primary">{application.scoreBreakdown.education}%</span>
              </div>
            </div>
          )}

          {application?.aiExplanation && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>
                AI EXPLANATION
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {application.aiExplanation.experienceNote || 'No explanation available.'}
              </p>
              {application.aiExplanation.matchedSkills?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Matched Skills</div>
                  <div className="tag-list">
                    {application.aiExplanation.matchedSkills.map((skill) => (
                      <span key={`matched-${skill}`} className="tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {application.aiExplanation.missingSkills?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Missing Skills</div>
                  <div className="tag-list">
                    {application.aiExplanation.missingSkills.map((skill) => (
                      <span key={`missing-${skill}`} className="tag" style={{ borderColor: 'var(--color-warning)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Radar Chart Visualization */}
        <div style={{ height: 250, position: 'relative' }}>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip />
                <Radar
                  name="Candidate"
                  dataKey="A"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Benchmark"
                  dataKey="B"
                  stroke="#d1d5db"
                  fill="#f3f4f6"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              No matching data for radar chart
            </div>
          )}
        </div>
      </div>

      {application && (
        <div className="flex items-center gap-sm" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          {application.status === 'applied' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onShortlist?.(application._id)}>
              Shortlist
            </button>
          )}
          {(application.status === 'shortlisted' || application.status === 'interview') && (
            <button className="btn btn-primary btn-sm" onClick={() => onSchedule?.(application._id)}>
              Schedule Interview
            </button>
          )}
          {blindMode && !application.isIdentityRevealed && application.status !== 'applied' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onReveal?.(application._id)}>
              Reveal Identity
            </button>
          )}
        </div>
      )}
    </div>
  );
}
