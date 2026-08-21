import io
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from app.models.session import StudySession
from app.models.event import AttentionEvent
from app.models.summary import SessionSummary
from app.models.insight import AIInsight
from app.services.attention.scoring_engine import scoring_engine
from app.utils.thresholds import (
    EVENT_ATTENTIVE, EVENT_DISTRACTED, EVENT_NO_FACE, EVENT_POSSIBLE_DROWSINESS,
    EVENT_LOOKING_LEFT, EVENT_LOOKING_RIGHT, EVENT_LOOKING_UP, EVENT_LOOKING_DOWN,
    EVENT_MULTIPLE_FACES
)

def _format_sec(sec: float) -> str:
    total_sec = round(sec)
    mins = total_sec // 60
    s = total_sec % 60
    return f"{mins:02d}m {s:02d}s"

class ReportGenerator:
    def generate_session_pdf(
        self,
        session: StudySession,
        summary: SessionSummary,
        events: list[AttentionEvent],
        insight: AIInsight = None
    ) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=12
        )
        h2_style = ParagraphStyle(
            'Heading2_Custom',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body_Custom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer_Custom',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748b')
        )

        story = []

        # 1. Header & Title Banner
        story.append(Paragraph("FocusVision AI — Student Attention Session Report", title_style))
        story.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M:%S UTC')}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceAfter=14))

        # 2. Metadata Grid
        student_name = session.student.name if session.student else "Student"
        student_id = session.student.student_id if (session.student and session.student.student_id) else "N/A"
        start_str = session.start_time.strftime('%Y-%m-%d %H:%M:%S') if session.start_time else "N/A"
        end_str = session.end_time.strftime('%Y-%m-%d %H:%M:%S') if session.end_time else "N/A"
        duration_str = _format_sec(session.actual_duration)

        meta_data = [
            [
                Paragraph(f"<b>Student Name:</b> {student_name}", body_style),
                Paragraph(f"<b>Student ID:</b> {student_id}", body_style)
            ],
            [
                Paragraph(f"<b>Subject / Topic:</b> {session.subject}", body_style),
                Paragraph(f"<b>Planned Duration:</b> {session.planned_duration} mins", body_style)
            ],
            [
                Paragraph(f"<b>Start Time:</b> {start_str}", body_style),
                Paragraph(f"<b>End Time:</b> {end_str}", body_style)
            ],
            [
                Paragraph(f"<b>Actual Duration:</b> {duration_str}", body_style),
                Paragraph(f"<b>Session Status:</b> {session.status}", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # 3. Overall Score Card
        score_val = session.attention_score if session.attention_score is not None else 100.0
        score_color = '#10b981' if score_val >= 80 else ('#f59e0b' if score_val >= 60 else '#ef4444')
        
        score_data = [
            [
                Paragraph("<b>ESTIMATED ATTENTION SCORE</b>", body_style),
                Paragraph(f"<font color='{score_color}' size=16><b>{score_val:.1f} / 100</b></font>", body_style)
            ]
        ]
        score_table = Table(score_data, colWidths=[340, 200])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94a3b8')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 14))

        # 4. Observable Duration Breakdown Table
        story.append(Paragraph("Observable Time & Category Breakdown", h2_style))
        
        attentive_sec = summary.attentive_duration if summary else max(0.0, session.actual_duration)
        distracted_sec = summary.distraction_duration if summary else 0.0
        looking_away_sec = summary.looking_away_duration if summary else 0.0
        no_face_sec = summary.no_face_duration if summary else 0.0
        drowsiness_sec = summary.drowsiness_duration if summary else 0.0
        multiple_faces_sec = summary.multiple_faces_duration if summary else 0.0
        tot_sec = max(1.0, session.actual_duration)

        breakdown_data = [
            [
                Paragraph("<b>Category</b>", body_style),
                Paragraph("<b>Duration</b>", body_style),
                Paragraph("<b>Percentage</b>", body_style)
            ],
            [
                Paragraph("Attentive & Centered Focus", body_style),
                Paragraph(_format_sec(attentive_sec), body_style),
                Paragraph(f"{(attentive_sec / tot_sec) * 100:.1f}%", body_style)
            ],
            [
                Paragraph("Lateral / Downward Gaze Shift", body_style),
                Paragraph(_format_sec(looking_away_sec), body_style),
                Paragraph(f"{(looking_away_sec / tot_sec) * 100:.1f}%", body_style)
            ],
            [
                Paragraph("Qualified Distraction (Look Away)", body_style),
                Paragraph(_format_sec(distracted_sec), body_style),
                Paragraph(f"{(distracted_sec / tot_sec) * 100:.1f}%", body_style)
            ],
            [
                Paragraph("No Face Detected (Out of Frame)", body_style),
                Paragraph(_format_sec(no_face_sec), body_style),
                Paragraph(f"{(no_face_sec / tot_sec) * 100:.1f}%", body_style)
            ],
            [
                Paragraph("Prolonged Eye Closure (Possible Drowsiness)", body_style),
                Paragraph(_format_sec(drowsiness_sec), body_style),
                Paragraph(f"{(drowsiness_sec / tot_sec) * 100:.1f}%", body_style)
            ]
        ]
        breakdown_table = Table(breakdown_data, colWidths=[240, 150, 150])
        breakdown_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 14))

        # 5. AI Study Habit Recommendations (if present)
        if insight:
            story.append(Paragraph("AI Study Habit Recommendations", h2_style))
            story.append(Paragraph(insight.summary, body_style))
            story.append(Spacer(1, 4))
            
            recs = json.loads(insight.recommendations) if insight.recommendations.startswith("[") else insight.recommendations.split("\n")
            for idx, r in enumerate(recs):
                story.append(Paragraph(f"• <b>Recommendation {idx+1}:</b> {r}", body_style))
                story.append(Spacer(1, 2))
            story.append(Spacer(1, 12))

        # 6. Ethical & Technical Limitation Disclaimer
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
        story.append(Paragraph(
            "<b>Important Interpretation Note:</b> This system estimates observable attention-related visual signals "
            "(head pose, eye state) from webcam input. It does not measure internal cognitive mental states, motivation, "
            "or sleep health, and is not a medical or psychological diagnostic tool. Camera angles, ambient lighting, and "
            "physical books or handwritten note-taking can influence computer vision estimation.",
            disclaimer_style
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer

report_generator = ReportGenerator()
