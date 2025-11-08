import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Clock,
  Shield,
  Eye,
  Image,
  Layers,
  Info
} from 'lucide-react';
import { ValidationReport, ValidationCategory, ValidationIssue, ValidationSeverity } from '@/services/pdfValidationService';

interface ValidationReportViewProps {
  report: ValidationReport;
  onExportReport?: () => void;
  onRegenerateReport?: () => void;
}

const severityConfig: Record<ValidationSeverity, { icon: React.ComponentType<any>; color: string; bgColor: string; textColor: string }> = {
  low: {
    icon: Info,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  medium: {
    icon: AlertCircle,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  high: {
    icon: AlertTriangle,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  critical: {
    icon: XCircle,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  }
};

const categoryIcons: Record<string, React.ComponentType<any>> = {
  'Text Content': FileText,
  'Document Structure': Layers,
  'Accessibility': Eye,
  'Metadata Quality': Info,
  'Image Quality': Image,
  'Page Consistency': Shield,
  'Content Safety Analysis': Shield
};

export const ValidationReportView: React.FC<ValidationReportViewProps> = ({
  report,
  onExportReport,
  onRegenerateReport
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatProcessingTime = (timeMs: number) => {
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Validation Report</CardTitle>
              <CardDescription>
                Analysis for {report.documentName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onRegenerateReport && (
                <Button variant="outline" onClick={onRegenerateReport}>
                  Regenerate
                </Button>
              )}
              {onExportReport && (
                <Button variant="outline" onClick={onExportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(report.totalScore)}`}>
                  {report.totalScore}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getProgressColor(report.totalScore)}`}
                  style={{ width: `${report.totalScore}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{report.totalIssues}</p>
              <p className="text-sm text-gray-600">Total Issues</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatProcessingTime(report.processingTime)}
              </p>
              <p className="text-xs text-gray-500">
                Generated {formatDate(report.generatedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Category Scores</CardTitle>
          <CardDescription>
            Breakdown of validation scores by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.categories.map((category) => {
              const IconComponent = categoryIcons[category.name] || FileText;
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className={`text-sm font-bold ${getScoreColor(category.score)}`}>
                      {category.score}%
                    </span>
                  </div>
                  <Progress value={category.score} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{category.issues.length} issues</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Issues */}
      <div className="space-y-4">
        {report.categories.map((category) => (
          <Card key={category.name}>
            <Collapsible
              open={expandedCategories.has(category.name)}
              onOpenChange={() => toggleCategory(category.name)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {React.createElement(categoryIcons[category.name] || FileText, {
                        className: "h-5 w-5 text-gray-500"
                      })}
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(category.score)}`}>
                          {category.score}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {category.issues.length} issue{category.issues.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {expandedCategories.has(category.name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {category.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 py-4">
                      <CheckCircle className="h-5 w-5" />
                      <span>No issues found in this category</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {category.issues.map((issue) => {
                        const severityInfo = severityConfig[issue.severity];
                        const SeverityIcon = severityInfo.icon;
                        
                        return (
                          <div
                            key={issue.id}
                            className={`p-4 rounded-lg border-l-4 ${
                              issue.type === 'content_safe' 
                                ? 'bg-green-50 border-l-green-500' 
                                : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                  ? 'bg-red-50 border-l-red-500'
                                  : issue.type === 'incorrect_content' 
                                    ? 'bg-orange-50 border-l-orange-500'
                                    : `${severityInfo.bgColor} border-l-${severityInfo.color.split('-')[1]}-500`
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <SeverityIcon className={`h-5 w-5 mt-0.5 ${
                                issue.type === 'content_safe' 
                                  ? 'text-green-600' 
                                  : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                    ? 'text-red-600'
                                    : issue.type === 'incorrect_content'
                                      ? 'text-orange-600' 
                                      : severityInfo.textColor
                              }`} />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className={`font-medium ${
                                    issue.type === 'content_safe' 
                                      ? 'text-green-700' 
                                      : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                        ? 'text-red-700'
                                        : issue.type === 'incorrect_content'
                                          ? 'text-orange-700'
                                          : severityInfo.textColor
                                  }`}>
                                    {issue.title}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`${
                                        issue.type === 'content_safe'
                                          ? 'bg-green-100 text-green-700 border-green-200'
                                          : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : issue.type === 'incorrect_content'
                                              ? 'bg-orange-100 text-orange-700 border-orange-200'
                                              : `${severityInfo.bgColor} ${severityInfo.textColor} border-${severityInfo.color.split('-')[1]}-200`
                                      }`}
                                    >
                                      {issue.type === 'content_safe' ? 'SAFE' : 
                                       issue.type === 'harmful_content' ? 'HARMFUL' :
                                       issue.type === 'malpractice' ? 'MALPRACTICE' :
                                       issue.type === 'incorrect_content' ? 'INCORRECT' :
                                       issue.severity.toUpperCase()}
                                    </Badge>
                                    {issue.pageNumber && (
                                      <Badge variant="secondary" className="text-xs">
                                        Page {issue.pageNumber}
                                      </Badge>
                                    )}
                                    {issue.count && issue.count > 1 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {issue.count} instances
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-sm text-gray-700">
                                  {issue.description}
                                </p>
                                
                                {issue.suggestion && (
                                  <div className={`p-3 rounded-md ${
                                    issue.type === 'content_safe' 
                                      ? 'bg-green-50'
                                      : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                        ? 'bg-red-50'
                                        : issue.type === 'incorrect_content'
                                          ? 'bg-orange-50'
                                          : 'bg-blue-50'
                                  }`}>
                                    <p className={`text-sm ${
                                      issue.type === 'content_safe' 
                                        ? 'text-green-700'
                                        : issue.type === 'harmful_content' || issue.type === 'malpractice'
                                          ? 'text-red-700'
                                          : issue.type === 'incorrect_content'
                                            ? 'text-orange-700'
                                            : 'text-blue-700'
                                    }`}>
                                      <strong>
                                        {issue.type === 'content_safe' ? 'Status:' : 
                                         issue.type === 'harmful_content' || issue.type === 'malpractice' ? 'Action Required:' :
                                         'Suggestion:'}
                                      </strong> {issue.suggestion}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Issues by Severity</h4>
              <div className="space-y-2">
                {(['critical', 'high', 'medium', 'low'] as ValidationSeverity[]).map((severity) => {
                  const count = report.categories
                    .flatMap(cat => cat.issues)
                    .filter(issue => issue.severity === severity).length;
                  
                  if (count === 0) return null;
                  
                  const severityInfo = severityConfig[severity];
                  const SeverityIcon = severityInfo.icon;
                  
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SeverityIcon className={`h-4 w-4 ${severityInfo.textColor}`} />
                        <span className="capitalize">{severity}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Processing Time:</span>
                  <span>{formatProcessingTime(report.processingTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Report Generated:</span>
                  <span>{formatDate(report.generatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationReportView;