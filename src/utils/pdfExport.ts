import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Patient, Appointment, AppointmentInsight, Fact } from '../types';

export const exportPatientReportToPDF = async (
  patient: Patient,
  appointments: Appointment[],
  insights: AppointmentInsight[],
  facts: Fact[]
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return `${age} years`;
  };

  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    const lineHeight = fontSize * 0.35;
    
    addNewPageIfNeeded(lines.length * lineHeight + 5);
    
    lines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += 5; // Add some spacing after text
  };

  const addSection = (title: string, content: () => void) => {
    addNewPageIfNeeded(20);
    
    // Add section title
    pdf.setFillColor(59, 130, 246); // Blue background
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 2, yPosition + 2);
    
    yPosition += 10;
    pdf.setTextColor(0, 0, 0); // Reset to black
    
    content();
  };

  // Header
  pdf.setFillColor(37, 99, 235); // Darker blue
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Clinical Audio Processing - Patient Report', margin, 15);
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 35;

  // Patient Information
  addSection('Patient Demographics', () => {
    addText(`Full Name: ${patient.full_name}`, 12, true);
    addText(`Patient ID: ${patient.id}`);
    addText(`Date of Birth: ${formatDate(patient.date_of_birth)} (${calculateAge(patient.date_of_birth)})`);
    addText(`Sex at Birth: ${patient.sex_at_birth ? patient.sex_at_birth.charAt(0).toUpperCase() + patient.sex_at_birth.slice(1) : 'Not specified'}`);
    addText(`Blood Group: ${patient.blood_group || 'Not specified'}`);
    addText(`Record Created: ${formatDateTime(patient.created_at)}`);
    addText(`Last Updated: ${formatDateTime(patient.updated_at)}`);
  });

  // Appointments
  addSection(`Appointments (${appointments.length})`, () => {
    if (appointments.length === 0) {
      addText('No appointments found.');
    } else {
      appointments.forEach((appointment, index) => {
        addText(`Appointment ${index + 1}`, 11, true);
        addText(`Date & Time: ${formatDateTime(appointment.appointment_datetime)}`);
        addText(`ID: ${appointment.appointment_id}`);
        
        if (appointment.transcript_text) {
          addText('Transcript:', 10, true);
          addText(appointment.transcript_text);
        }
        
        if (appointment.summary_text) {
          addText('Summary:', 10, true);
          addText(appointment.summary_text);
        }
        
        yPosition += 5; // Extra spacing between appointments
      });
    }
  });

  // Clinical Insights
  addSection(`Clinical Insights (${insights.length})`, () => {
    if (insights.length === 0) {
      addText('No clinical insights available.');
    } else {
      insights.forEach((insight, index) => {
        addText(`Insight ${index + 1}`, 11, true);
        addText(`Date: ${formatDateTime(insight.inserted_at)}`);
        addText(`Appointment ID: ${insight.appointment_id}`);
        addText('Clinical Analysis:', 10, true);
        
        try {
          const formattedJson = JSON.stringify(insight.critical_json, null, 2);
          addText(formattedJson);
        } catch (error) {
          addText('Unable to format clinical data');
        }
        
        yPosition += 5;
      });
    }
  });

  // Clinical Facts
  addSection(`Clinical Facts (${facts.length})`, () => {
    if (facts.length === 0) {
      addText('No clinical facts available.');
    } else {
      facts.forEach((fact, index) => {
        addText(`${fact.fact_key || 'Unknown'}: ${fact.fact_value}`, 10, true);
        addText(`Recorded: ${formatDateTime(fact.inserted_at)}`);
        addText(`Appointment ID: ${fact.appointment_id}`);
        yPosition += 3;
      });
    }
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    
    const footerText = `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`;
    const textWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, pageWidth - margin - textWidth, pageHeight - 8);
    
    pdf.text('Clinical Audio Processing Application', margin, pageHeight - 8);
  }

  // Save the PDF
  const fileName = `${patient.full_name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};